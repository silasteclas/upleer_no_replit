import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: any,
  options?: RequestInit
): Promise<any> {
  const requestOptions: RequestInit = {
    method,
    credentials: "include",
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  if (data && method !== 'GET') {
    requestOptions.body = JSON.stringify(data);
  }

  console.log("Making API request:", url, method, data ? "with data" : "no data");
  
  const res = await fetch(url, requestOptions);
  
  console.log("API response status:", res.status);

  await throwIfResNotOk(res);
  
  // Return JSON response for successful requests
  try {
    const jsonResponse = await res.json();
    console.log("API response data:", jsonResponse);
    return jsonResponse;
  } catch (e) {
    console.log("No JSON response body");
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Melhor cache para dados estáticos
      staleTime: 5 * 60 * 1000, // 5 minutos para dados de usuário
      gcTime: 10 * 60 * 1000, // 10 minutos para garbage collection
      retry: (failureCount, error) => {
        // Não retry em erros de autenticação
        if (error.message.includes('401')) return false;
        return failureCount < 2;
      },
      // Configuração específica por tipo de query
      refetchOnMount: false,
      refetchOnReconnect: 'always',
      // Network mode otimizado
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
});

// Configurações específicas para diferentes tipos de dados
export const queryOptions = {
  // Dados do usuário - cache longo
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  // Dados de produtos - cache médio
  products: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  },
  // Dados de vendas - cache curto
  sales: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000, // 3 minutos
  },
  // Dados de analytics - cache muito curto
  analytics: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
  },
};
