// Utilitário de Validação de CPF com lógica matemática oficial brasileira

export function validarCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const nums = cpf.replace(/[^\d]/g, '');

  if (nums.length !== 11) return false;

  // Elimina CPFs invalidos conhecidos (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(nums)) return false;

  // Validação do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(nums.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let dv1 = (resto === 10 || resto === 11) ? 0 : resto;
  if (dv1 !== parseInt(nums.charAt(9))) return false;

  // Validação do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(nums.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let dv2 = (resto === 10 || resto === 11) ? 0 : resto;
  if (dv2 !== parseInt(nums.charAt(10))) return false;

  return true;
}

export function formatarCPF(valor: string): string {
  const nums = valor.replace(/[^\d]/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
}
