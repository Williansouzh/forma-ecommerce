"use client";

import type { Product } from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BASE = `${API_URL}/api/v1`;
const TOKEN_KEY = "forma-admin-token";

export interface AdminSession {
  accessToken: string;
  user: { sub: string; email: string; name: string; role: string };
}

export interface ProductImageInput {
  url: string;
  alt: string;
}

export type ProductInput = Partial<
  Omit<Product, "id" | "createdAt" | "updatedAt" | "variants" | "images">
> & {
  images?: ProductImageInput[];
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401) {
    clearToken();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? `Erro ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? "Credenciais inválidas");
  }
  const session = (await response.json()) as AdminSession;
  saveToken(session.accessToken);
  return session;
}

export async function listProducts(): Promise<Product[]> {
  return authFetch<Product[]>("/products?limit=200");
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return authFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<Product> {
  return authFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await authFetch<unknown>(`/products/${id}`, { method: "DELETE" });
}
