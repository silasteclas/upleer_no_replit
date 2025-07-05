import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Set correct domains for the renamed project
if (!process.env.REPLIT_DOMAINS || process.env.REPLIT_DOMAINS.includes("prompt-flow-adm64")) {
  process.env.REPLIT_DOMAINS = `${process.env.REPLIT_SLUG || 'bbf3fd2f-5839-4fea-9611-af32c6e20f91-00-2j7vwbakpk3p3'}.kirk.replit.dev,prompt-flow-adm64.replit.app`;
  console.log(`[CONFIG] Updated REPLIT_DOMAINS to: ${process.env.REPLIT_DOMAINS}`);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add webhook endpoints BEFORE any other middleware to avoid Vite interception
// Order status update endpoint - positioned early to avoid conflicts
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    console.log(`[ORDER-STATUS] PATCH /api/orders/${req.params.id}/status`);
    console.log(`[ORDER-STATUS] Body:`, req.body);
    
    const orderId = req.params.id;
    const { status, status_pagamento, status_envio } = req.body;

    if (!orderId) {
      console.log(`[ORDER-STATUS] Missing order ID`);
      return res.status(400).json({ message: 'ID do pedido é obrigatório' });
    }

    const { storage } = await import("./storage");

    // Busca o pedido
    const order = await storage.getOrder(orderId);
    if (!order) {
      console.log(`[ORDER-STATUS] Order ${orderId} not found`);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Monta objeto de atualização apenas com campos enviados
    const updates: any = {};
    if (typeof status !== 'undefined') updates.status = status;
    if (typeof status_pagamento !== 'undefined') updates.statusPagamento = status_pagamento;
    if (typeof status_envio !== 'undefined') updates.statusEnvio = status_envio;

    if (Object.keys(updates).length === 0) {
      console.log(`[ORDER-STATUS] No fields to update`);
      return res.status(400).json({ message: 'Nenhum campo para atualizar' });
    }

    console.log(`[ORDER-STATUS] Updating order ${orderId} with:`, updates);

    // Atualiza o pedido
    const updatedOrder = await storage.updateOrder(orderId, updates);

    console.log(`[ORDER-STATUS] Order ${orderId} updated successfully`);

    res.json({
      message: 'Status do pedido atualizado com sucesso',
      order: updatedOrder
    });
  } catch (error) {
    console.error('[ORDER-STATUS] Erro ao atualizar status do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Sales webhook endpoint
app.post('/api/webhook/sales', async (req, res) => {
  try {
    const { storage } = await import("./storage");
    const {
      productId,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerCpf,
      buyerAddress,
      buyerCity,
      buyerState,
      buyerZipCode,
      salePrice,
      orderDate,
      paymentStatus,
      paymentMethod,
      installments,
      discountCoupon,
      discountAmount,
      shippingCost,
      shippingCarrier,
      deliveryDays
    } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'productId é obrigatório' });
    }
    
    if (!buyerName || !buyerEmail) {
      return res.status(400).json({ message: 'buyerName e buyerEmail são obrigatórios' });
    }
    
    if (!salePrice) {
      return res.status(400).json({ message: 'salePrice é obrigatório' });
    }
    
    // Check if product exists and get the author
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    // Convert string prices to numbers
    const price = parseFloat(salePrice.toString().replace(',', '.'));
    const discount = discountAmount ? parseFloat(discountAmount.toString().replace(',', '.')) : 0;
    const shipping = shippingCost ? parseFloat(shippingCost.toString().replace(',', '.')) : 0;
    
    // FASE 4: Usar dados financeiros da tabela products
    let commission, authorEarnings, platformCommission;
    
    if (product.authorEarnings && product.platformCommission) {
      // Usar dados armazenados na tabela products (FASE 1-3)
      authorEarnings = parseFloat(product.authorEarnings.toString());
      platformCommission = parseFloat(product.platformCommission.toString());
      commission = platformCommission; // Para compatibilidade com código existente
      
      console.log(`[SALE] FASE 4 - Usando dados financeiros do produto:`);
      console.log(`  💰 Ganho do autor: R$ ${authorEarnings.toFixed(2)}`);
      console.log(`  🏢 Ganho da plataforma: R$ ${platformCommission.toFixed(2)}`);
      console.log(`  🧮 Taxa fixa: R$ ${product.fixedFee || 9.90}`);
      console.log(`  📄 Custo por página: R$ ${product.printingCostPerPage || 0.10}`);
      console.log(`  📊 Taxa de comissão: ${product.commissionRate || 30}%`);
    } else {
      // Fallback para produtos antigos sem dados financeiros
      const commissionRate = 0.15;
      commission = price * commissionRate;
      authorEarnings = price - commission;
      
      console.log(`[SALE] FASE 4 - Fallback para produto sem dados financeiros:`);
      console.log(`  💰 Ganho do autor (15%): R$ ${authorEarnings.toFixed(2)}`);
      console.log(`  🏢 Comissão (85%): R$ ${commission.toFixed(2)}`);
      console.log(`  ⚠️  Produto ID ${productId} deveria ter dados financeiros atualizados`);
    }
    
    // Create sale record - the authorId is automatically determined by the product
    const saleData = {
      productId: productId,
      buyerName: buyerName,
      buyerEmail: buyerEmail,
      buyerPhone: buyerPhone || '',
      buyerCpf: buyerCpf || '',
      buyerAddress: buyerAddress || '',
      buyerCity: buyerCity || '',
      buyerState: buyerState || '',
      buyerZipCode: buyerZipCode || '',
      salePrice: price.toFixed(2),
      commission: commission.toFixed(2),
      authorEarnings: authorEarnings.toFixed(2),
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: paymentMethod || '',
      installments: installments || 1,
      discountCoupon: discountCoupon || '',
      discountAmount: discount.toFixed(2),
      shippingCost: shipping.toFixed(2),
      shippingCarrier: shippingCarrier || '',
      deliveryDays: deliveryDays || 0
    };
    
    const newSale = await storage.createSale(saleData);
    
    console.log(`[WEBHOOK] New sale created: ID ${newSale.id} for product ${productId} (author: ${product.authorId})`);
    
    res.json({
      message: 'Venda registrada com sucesso',
      sale: {
        id: newSale.id,
        productId: newSale.productId,
        productTitle: product.title,
        authorId: product.authorId,
        authorName: product.author,
        buyerName: newSale.buyerName,
        buyerEmail: newSale.buyerEmail,
        salePrice: newSale.salePrice,
        commission: newSale.commission,
        authorEarnings: newSale.authorEarnings,
        orderDate: newSale.orderDate,
        paymentStatus: newSale.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// NOVO ENDPOINT MARKETPLACE: Multiple sales webhook endpoint - FASE 4
app.post('/api/webhook/sales/batch', async (req, res) => {
  try {
    const { storage } = await import("./storage");
    let salesData = req.body;
    
    // FASE 4: Log de auditoria para rastreamento
    console.log('[WEBHOOK-BATCH-V4] 🚀 FASE 4 IMPLEMENTADA - USANDO DADOS FINANCEIROS DA TABELA PRODUCTS');
    console.log('[WEBHOOK-BATCH-V4] 📋 Raw payload received:', JSON.stringify(salesData, null, 2));
    console.log('[WEBHOOK-BATCH-V4] Payload type:', typeof salesData);
    console.log('[WEBHOOK-BATCH-V4] Is array:', Array.isArray(salesData));
    console.log('[WEBHOOK-BATCH-V4] Length:', salesData?.length);
    
    // Handle different payload structures from N8N
    if (Array.isArray(salesData) && salesData.length === 1 && salesData[0].data) {
      // N8N sends: [{ "data": [...] }]
      salesData = salesData[0].data;
      console.log('[WEBHOOK-BATCH-V4] Extracted data from N8N wrapper');
    } else if (salesData.data && Array.isArray(salesData.data)) {
      // N8N sends: { "data": [...] }
      salesData = salesData.data;
      console.log('[WEBHOOK-BATCH-V4] Extracted data from object wrapper');
    } else if (Array.isArray(salesData) && salesData.length > 0 && salesData[0].order_id) {
      // N8N sends directly: [{ "order_id": ..., "id_autor": ... }]
      console.log('[WEBHOOK-BATCH-V4] Using direct array format');
    }
    
    if (!Array.isArray(salesData)) {
      return res.status(400).json({ 
        message: 'Payload deve ser um array de vendas ou objeto com campo "data"',
        received: typeof salesData,
        example: 'Esperado: [{"order_id": 123, ...}] ou {"data": [{"order_id": 123, ...}]}'
      });
    }
    
    if (salesData.length === 0) {
      return res.status(400).json({ message: 'Array de vendas não pode estar vazio' });
    }
    
    const results = [];
    const errors = [];
    
    // Extract order information from first item
    const firstItem = salesData[0];
    const orderId = firstItem.order_id;
    const clienteNome = firstItem.cliente_nome || 'Cliente Não Informado';
    const clienteEmail = firstItem.cliente_email || 'nao-informado@email.com';
    
    // NOVOS CAMPOS DO CLIENTE
    const clienteCpf = firstItem.cliente_cpf || '';
    const clienteTelefone = firstItem.cliente_telefone || '';
    
    // NOVOS CAMPOS DE ENDEREÇO
    const endereco = firstItem.endereco || {};
    const enderecoRua = endereco.rua || '';
    const enderecoNumero = endereco.numero || '';
    const enderecoBairro = endereco.bairro || '';
    const enderecoCidade = endereco.cidade || '';
    const enderecoEstado = endereco.estado || '';
    const enderecoCep = endereco.cep || '';
    const enderecoComplemento = endereco.complemento || '';
    
    // NOVOS CAMPOS DE PAGAMENTO/ENVIO
    const formaPagamento = firstItem.forma_pagamento || '';
    const bandeiraCartao = firstItem.bandeira_cartao || '';
    const parcelas = firstItem.parcelas || '1';
    const statusPagamento = firstItem.status_pagamento || 'pending';
    const statusEnvio = firstItem.status_envio || 'unpacked';
    
    if (!orderId) {
      return res.status(400).json({ message: 'order_id é obrigatório no payload' });
    }
    
    console.log(`[WEBHOOK-BATCH-V4] 📦 Processing order ${orderId} with ${salesData.length} vendors`);
    console.log(`[WEBHOOK-BATCH-V4] 📋 Cliente: ${clienteNome} (${clienteEmail})`);
    console.log(`[WEBHOOK-BATCH-V4] 💳 Pagamento: ${formaPagamento} ${parcelas}x`);
    console.log(`[WEBHOOK-BATCH-V4] 📍 Endereço: ${enderecoCidade}/${enderecoEstado}`);
    
    // FASE 4: IMPLEMENTAR MODELO MARKETPLACE COM NOVOS CAMPOS
    // 1. Create ORDER record (one per order) with complete data
    try {
      // Calculate total order value
      let valorTotalOrder = 0;
      for (const saleItem of salesData) {
        if (saleItem.produtos && Array.isArray(saleItem.produtos)) {
          for (const produto of saleItem.produtos) {
            const unitPrice = parseFloat(produto.preco.toString().replace(',', '.'));
            valorTotalOrder += unitPrice * produto.quantidade;
          }
        }
      }
      
      // Create order record with all new fields
      await storage.createOrder({
        id: orderId.toString(),
        clienteNome: clienteNome,
        clienteEmail: clienteEmail,
        // NOVOS CAMPOS DO CLIENTE
        clienteCpf: clienteCpf,
        clienteTelefone: clienteTelefone,
        // CAMPOS DE ENDEREÇO
        enderecoRua: enderecoRua,
        enderecoNumero: enderecoNumero,
        enderecoBairro: enderecoBairro,
        enderecoCidade: enderecoCidade,
        enderecoEstado: enderecoEstado,
        enderecoCep: enderecoCep,
        enderecoComplemento: enderecoComplemento,
        valorTotal: valorTotalOrder.toFixed(2),
        // NOVOS CAMPOS DE PAGAMENTO/ENVIO
        formaPagamento: formaPagamento,
        bandeiraCartao: bandeiraCartao,
        parcelas: parcelas,
        statusPagamento: statusPagamento,
        statusEnvio: statusEnvio,
        status: 'pending'
      });
      
      console.log(`[WEBHOOK-BATCH-V3] ✅ Order created: ${orderId} - R$ ${valorTotalOrder.toFixed(2)}`);
      
    } catch (orderError: unknown) {
      const errorMessage = orderError instanceof Error ? orderError.message : 'Erro desconhecido';
      if (errorMessage.includes('duplicate key')) {
        console.log(`[WEBHOOK-BATCH-V3] ⚠️ Order ${orderId} already exists, continuing...`);
      } else {
        console.error(`[WEBHOOK-BATCH-V3] ❌ Error creating order:`, orderError);
        return res.status(500).json({ message: 'Erro ao criar pedido', error: errorMessage });
      }
    }
    
    // 2. Create SALES records (one per vendor per order)
    for (const saleItem of salesData) {
      try {
        console.log('[WEBHOOK-BATCH-V3] 📤 Processing vendor item:', JSON.stringify(saleItem, null, 2));
        const { order_id, id_autor, produtos, valor_total, cliente_nome, cliente_email } = saleItem;
        
        console.log('[WEBHOOK-BATCH-V3] Extracted vendor fields:', {
          order_id, id_autor, produtos: produtos?.length, valor_total, cliente_nome, cliente_email
        });
        
        if (!order_id || !id_autor || !produtos || !Array.isArray(produtos)) {
          errors.push({
            author: id_autor || 'unknown',
            error: `Dados obrigatórios: order_id (${!!order_id}), id_autor (${!!id_autor}), produtos array (${Array.isArray(produtos)})`
          });
          continue;
        }
        
        // Calculate total for this vendor
        let vendorTotal = 0;
        const vendorProducts = [];
        
        for (const produto of produtos) {
          const { id_produto_interno, nome, preco, quantidade } = produto;
          
          if (!id_produto_interno || !preco || !quantidade) {
            errors.push({
              author: id_autor,
              product: nome,
              error: 'Dados obrigatórios do produto: id_produto_interno, preco, quantidade'
            });
            continue;
          }
          
          // Check if product exists
          const product = await storage.getProduct(parseInt(id_produto_interno));
          if (!product) {
            errors.push({
              author: id_autor,
              product: nome,
              error: `Produto ${id_produto_interno} não encontrado`
            });
            continue;
          }
          
          // Calculate values for this product
          const unitPrice = parseFloat(preco.toString().replace(',', '.'));
          const totalPrice = unitPrice * quantidade;
          vendorTotal += totalPrice;
          
          vendorProducts.push({
            product,
            unitPrice,
            totalPrice,
            quantidade,
            id_produto_interno
          });
        }
        
        if (vendorProducts.length === 0) {
          errors.push({
            author: id_autor,
            error: 'Nenhum produto válido encontrado para este vendedor'
          });
          continue;
        }
        
        // FASE 4: Calcular comissão usando dados financeiros dos produtos
        let vendorCommission = 0;
        let vendorEarnings = 0;
        
        // Calcular baseado nos dados financeiros de cada produto individualmente
        for (const vendorProduct of vendorProducts) {
          const product = vendorProduct.product;
          
          if (product.authorEarnings && product.platformCommission) {
            // Usar dados armazenados na tabela products (FASE 1-3)
            const productAuthorEarnings = parseFloat(product.authorEarnings.toString());
            const productPlatformCommission = parseFloat(product.platformCommission.toString());
            
            // Proporção baseada na quantidade vendida
            const quantityRatio = vendorProduct.quantidade;
            vendorEarnings += productAuthorEarnings * quantityRatio;
            vendorCommission += productPlatformCommission * quantityRatio;
            
            console.log(`[BATCH-SALE] FASE 4 - Produto ${product.id} (${vendorProduct.quantidade}x):`);
            console.log(`  💰 Ganho autor unitário: R$ ${productAuthorEarnings.toFixed(2)}`);
            console.log(`  🏢 Ganho plataforma unitário: R$ ${productPlatformCommission.toFixed(2)}`);
          } else {
            // Fallback para produtos antigos
            const commissionRate = 0.15;
            const productTotal = vendorProduct.totalPrice;
            const productCommission = productTotal * commissionRate;
            const productEarnings = productTotal - productCommission;
            
            vendorCommission += productCommission;
            vendorEarnings += productEarnings;
            
            console.log(`[BATCH-SALE] FASE 4 - Fallback produto ${product.id}:`);
            console.log(`  ⚠️  Usando cálculo antigo (15% comissão)`);
          }
        }
        
        console.log(`[BATCH-SALE] FASE 4 - Total do vendedor ${id_autor}:`);
        console.log(`  💰 Total ganho autor: R$ ${vendorEarnings.toFixed(2)}`);
        console.log(`  🏢 Total ganho plataforma: R$ ${vendorCommission.toFixed(2)}`);
        console.log(`  🔢 Total vendas: R$ ${vendorTotal.toFixed(2)}`);
        console.log(`  ✅ Verificação: ${(vendorEarnings + vendorCommission).toFixed(2)} = ${vendorTotal.toFixed(2)}`);
        
        // Auditoria: verificar se os cálculos batem
        const calculatedTotal = vendorEarnings + vendorCommission;
        if (Math.abs(calculatedTotal - vendorTotal) > 0.01) {
          console.warn(`[BATCH-SALE] ⚠️  ATENÇÃO: Diferença nos cálculos detectada!`);
          console.warn(`  Calculado: R$ ${calculatedTotal.toFixed(2)} vs Esperado: R$ ${vendorTotal.toFixed(2)}`);
        }
        
        // Get next vendor order number for this author
        const nextVendorOrderNumber = await storage.getNextVendorOrderNumber(id_autor);
        
        // 🔍 DEBUG: Log payment data extraction
        console.log(`[WEBHOOK-BATCH-V4] 🔍 PAYMENT DEBUG for vendor ${id_autor}:`);
        console.log(`   Raw firstItem.forma_pagamento: "${firstItem.forma_pagamento}"`);
        console.log(`   Extracted formaPagamento: "${formaPagamento}"`);
        console.log(`   Raw firstItem.status_pagamento: "${firstItem.status_pagamento}"`);
        console.log(`   Extracted statusPagamento: "${statusPagamento}"`);
        console.log(`   Raw firstItem.parcelas: "${firstItem.parcelas}"`);
        console.log(`   Extracted parcelas: "${parcelas}"`);
        
        // Create SALE record for this vendor with complete data
        const saleData = {
          orderId: orderId.toString(),
          authorId: id_autor,
          vendorOrderNumber: nextVendorOrderNumber,
          productId: vendorProducts[0].product.id, // Use first product as reference
          buyerName: cliente_nome,
          buyerEmail: cliente_email,
          // NOVOS CAMPOS DO CLIENTE
          buyerPhone: clienteTelefone,
          buyerCpf: clienteCpf,
          buyerAddress: `${enderecoRua}, ${enderecoNumero}${enderecoComplemento ? ', ' + enderecoComplemento : ''}`,
          buyerCity: enderecoCidade,
          buyerState: enderecoEstado,
          buyerZipCode: enderecoCep,
          salePrice: vendorTotal.toFixed(2),
          commission: vendorCommission.toFixed(2),
          authorEarnings: vendorEarnings.toFixed(2),
          orderDate: new Date(),
          // NOVOS CAMPOS DE PAGAMENTO
          paymentStatus: statusPagamento === 'pending' ? 'pendente' : 
                        statusPagamento === 'approved' ? 'aprovado' : 'pendente',
          paymentMethod: formaPagamento === 'pix' ? 'pix' :
                        formaPagamento === 'cartao_credito' ? 'cartao_credito' :
                        formaPagamento === 'boleto' ? 'boleto' : 'pix',
          installments: parseInt(parcelas) || 1,
          discountCoupon: `ORDER_${order_id}`,
          discountAmount: '0.00',
          shippingCost: '0.00',
          shippingCarrier: '',
          deliveryDays: 0,
          quantity: vendorProducts.reduce((sum, p) => sum + p.quantidade, 0)
        };
        
        // 🔍 DEBUG: Log final saleData before saving
        console.log(`[WEBHOOK-BATCH-V4] 🔍 SALE DATA FINAL for vendor ${id_autor}:`);
        console.log(`   paymentStatus: "${saleData.paymentStatus}"`);
        console.log(`   paymentMethod: "${saleData.paymentMethod}" ${saleData.paymentMethod ? '✅' : '❌ VAZIO'}`);
        console.log(`   installments: ${saleData.installments}`);
        console.log(`   buyerPhone: "${saleData.buyerPhone}"`);
        console.log(`   buyerCpf: "${saleData.buyerCpf}"`);
        
        const newSale = await storage.createSale(saleData);
        console.log(`[WEBHOOK-BATCH-V3] ✅ Sale created: ID ${newSale.id} for vendor ${id_autor}`);
        
        // 🔍 DEBUG: Log what was actually saved to database
        console.log(`[WEBHOOK-BATCH-V4] 🔍 SAVED TO DB - Sale ID ${newSale.id}:`);
        console.log(`   Saved paymentStatus: "${newSale.paymentStatus}"`);
        console.log(`   Saved paymentMethod: "${newSale.paymentMethod}" ${newSale.paymentMethod ? '✅' : '❌ VAZIO'}`);
        console.log(`   Saved installments: ${newSale.installments}`);
        console.log(`   Saved buyerPhone: "${newSale.buyerPhone}"`);
        console.log(`   Saved buyerCpf: "${newSale.buyerCpf}"`);
        
        // 3. Create SALE_ITEMS records for each product with foto_produto
        for (let i = 0; i < vendorProducts.length; i++) {
          const vendorProduct = vendorProducts[i];
          const originalProduct = produtos[i]; // Get original product data from N8N
          
          await storage.createSaleItem({
            saleId: newSale.id,
            productId: vendorProduct.id_produto_interno.toString(),
            productName: vendorProduct.product.title,
            price: vendorProduct.totalPrice.toFixed(2),
            quantity: vendorProduct.quantidade,
            // NOVO CAMPO: Foto do produto do N8N
            fotoProduto: originalProduct?.foto_produto || null
          });
          
          console.log(`[WEBHOOK-BATCH-V4] ✅ Sale item created: ${vendorProduct.product.title} (${vendorProduct.quantidade}x)`);
          if (originalProduct?.foto_produto) {
            console.log(`[WEBHOOK-BATCH-V4] 📸 Product image: ${originalProduct.foto_produto}`);
          }
        }
        
        results.push({
          saleId: newSale.id,
          orderId: order_id,
          authorId: id_autor,
          vendorTotal: vendorTotal.toFixed(2),
          vendorCommission: vendorCommission.toFixed(2),
          vendorEarnings: vendorEarnings.toFixed(2),
          productCount: vendorProducts.length,
          totalQuantity: vendorProducts.reduce((sum, p) => sum + p.quantidade, 0),
          products: vendorProducts.map(vp => ({
            productId: vp.id_produto_interno,
            productTitle: vp.product.title,
            quantity: vp.quantidade,
            unitPrice: vp.unitPrice.toFixed(2),
            totalPrice: vp.totalPrice.toFixed(2)
          })),
          buyerName: cliente_nome,
          buyerEmail: cliente_email
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[WEBHOOK-BATCH-V3] ❌ Error processing vendor ${saleItem.id_autor}:`, error);
        errors.push({
          author: saleItem.id_autor,
          error: errorMessage
        });
      }
    }
    
    const response = {
      message: `🎉 MARKETPLACE V4: Processamento concluído com dados completos`,
      orderId: orderId,
      clienteInfo: {
        nome: clienteNome,
        email: clienteEmail,
        cpf: clienteCpf,
        telefone: clienteTelefone,
        endereco: {
          rua: enderecoRua,
          numero: enderecoNumero,
          bairro: enderecoBairro,
          cidade: enderecoCidade,
          estado: enderecoEstado,
          cep: enderecoCep,
          complemento: enderecoComplemento
        }
      },
      pagamentoInfo: {
        forma: formaPagamento,
        bandeira: bandeiraCartao,
        parcelas: parcelas,
        status: statusPagamento
      },
      envioInfo: {
        status: statusEnvio
      },
      totalVendors: results.length,
      totalProducts: results.reduce((sum, r) => sum + r.productCount, 0),
      totalQuantity: results.reduce((sum, r) => sum + r.totalQuantity, 0),
      totalValue: results.reduce((sum, r) => sum + parseFloat(r.vendorTotal), 0).toFixed(2),
      totalErrors: errors.length,
      vendors: results,
      ...(errors.length > 0 && { errors })
    };
    
    console.log(`[WEBHOOK-BATCH-V3] 🎉 Completed: ${results.length} vendors processed, ${errors.length} errors`);
    
    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json(response);
    }
    
    res.json(response);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[WEBHOOK-BATCH-V3] ❌ Error processing batch sales:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: errorMessage });
  }
});

// Product status webhook endpoint
app.patch('/api/webhook/products/:id/status', async (req, res) => {
  try {
    const { storage } = await import("./storage");
    const productId = parseInt(req.params.id);
    const { status, publicUrl } = req.body;
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: 'ID do produto inválido' });
    }
    
    if (!status) {
      return res.status(400).json({ message: 'Status é obrigatório' });
    }
    
    // Valid status values
    const validStatuses = ['pending', 'published', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Status inválido. Valores permitidos: pending, published, rejected, archived' 
      });
    }
    
    // Check if product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    // Update product status and public URL
    const updates: any = { status };
    if (publicUrl) {
      updates.publicUrl = publicUrl;
    }
    
    const updatedProduct = await storage.updateProduct(productId, updates);
    
    console.log(`[WEBHOOK] Product ${productId} status updated to ${status}${publicUrl ? ` with URL ${publicUrl}` : ''}`);
    
    res.json({
      message: 'Status do produto atualizado com sucesso',
      product: {
        id: updatedProduct.id,
        status: updatedProduct.status,
        publicUrl: updatedProduct.publicUrl,
        title: updatedProduct.title,
        author: updatedProduct.author
      }
    });
    
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Log all requests to identify routing issues
  console.log(`[REQUEST] ${req.method} ${req.path} from ${req.hostname}`);
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server;
  
  try {
    server = await registerRoutes(app);
    console.log('[SERVER] Routes registered successfully');
  } catch (error) {
    console.error('[SERVER] Error during route registration:', error);
    // Continue with basic server setup even if routes fail
    const { createServer } = await import("http");
    server = createServer(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('[ERROR]', message, err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configurable port
  // this serves both the API and the client.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const host = process.env.HOST || "0.0.0.0"; // Permite conexões externas
  
  server.listen(port, host, () => {
    console.log(`\n🚀 Servidor rodando com sucesso!`);
    console.log(`📍 Acesse localmente: http://localhost:${port}`);
    console.log(`📍 Acesse pela rede: http://127.0.0.1:${port}`);
    if (host === "0.0.0.0") {
      console.log(`📍 Aceita conexões externas na porta ${port}`);
    }
    console.log(`\n💡 Para parar o servidor, pressione Ctrl+C\n`);
    log(`serving on port ${port} host ${host}`);
  });
})();