export function translateAuthError(message: string | undefined | null): string {
  const msg = (message || '').toLowerCase();
  if (!msg) return 'Erro desconhecido. Tente novamente.';

  if (msg.includes('known to be weak') || msg.includes('pwned') || msg.includes('compromised')) {
    return 'Essa senha é muito fraca ou já vazou em outros sites. Escolha uma senha mais forte, com letras, números e símbolos.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'A senha é muito curta. Use no mínimo 6 caracteres.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'Este email já está cadastrado. Faça login.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Credenciais inválidas. Verifique seu email e senha.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email não confirmado. Verifique sua caixa de entrada.';
  }
  if (msg.includes('invalid email')) {
    return 'Email inválido. Verifique o endereço digitado.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  if (msg.includes('signup') && msg.includes('disabled')) {
    return 'Cadastros estão temporariamente desativados.';
  }
  return message || 'Erro desconhecido. Tente novamente.';
}
