let tokenProvider: () => Promise<string | null> = async () => null;

export function configurarTokenProvider(fn: () => Promise<string | null>): void {
  tokenProvider = fn;
}

export async function obterIdToken(): Promise<string | null> {
  return tokenProvider();
}
