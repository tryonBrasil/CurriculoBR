
// ✅ Validação de Email
export const validateEmail = (email: string): boolean => {
  // Regex mais robusta para email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validateEmailError = (email: string): string | null => {
  if (!email) return null;
  if (!validateEmail(email)) {
    return 'Email inválido. Verifique o formato.';
  }
  return null;
};

// ✅ Validação de Telefone
export const validatePhone = (phone: string): boolean => {
  // Regex mais permissiva para formatos internacionais e brasileiros
  // Aceita: (11) 99999-9999, +55 11 99999-9999, 11 99999999, etc.
  const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?(\(?\d{2,3}\)?[-.\s]?)?\d{4,5}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
};

export const validatePhoneError = (phone: string): string | null => {
  if (!phone) return null;
  if (!validatePhone(phone)) {
    return 'Telefone inválido. Use um formato numérico válido.';
  }
  return null;
};

// ✅ Validação de Datas
export const validateDateFormat = (date: string): boolean => {
  if (!date) return true;
  if (date.toLowerCase() === 'atual') return true;
  
  // Aceita formatos: MM/AAAA, AAAA, Mês Ano
  const dateRegex = /^(0[1-9]|1[0-2])\/\d{4}$|^\d{4}$|^[a-zA-Z]+\s\d{4}$/;
  return dateRegex.test(date);
};

export const validateDateRange = (
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { valid: true };
  }

  if (endDate.toLowerCase() === 'atual') {
    return { valid: true };
  }

  try {
    // Converter formato MM/AAAA para Date
    const parseDate = (dateStr: string): Date => {
      const parts = dateStr.split('/');
      if (parts.length === 2) {
        return new Date(`${parts[1]}-${parts[0]}-01`);
      }
      // Se for apenas ano
      if (/^\d{4}$/.test(dateStr)) {
        return new Date(`${dateStr}-01-01`);
      }
      return new Date(dateStr);
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (start > end) {
      return {
        valid: false,
        error: 'Término deve ser após início'
      };
    }

    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: 'Data inválida'
    };
  }
};

// ✅ Validação de URL
export const validateURL = (url: string): boolean => {
  if (!url) return true;
  try {
    // Adiciona protocolo se não tiver para validar corretamente
    const checkUrl = url.startsWith('http') ? url : `https://${url}`;
    new URL(checkUrl);
    return true;
  } catch {
    return false;
  }
};

export const validateURLError = (url: string, fieldName: string): string | null => {
  if (!url) return null;
  if (!validateURL(url)) {
    return `${fieldName} inválida.`;
  }
  return null;
};

// ✅ Validação de Comprimento de Texto
export const validateTextLength = (
  text: string,
  minLength: number = 0,
  maxLength: number = Infinity
): { valid: boolean; error?: string } => {
  if (!text && minLength === 0) {
    return { valid: true };
  }

  if (text.length < minLength) {
    return {
      valid: false,
      error: `Mínimo de ${minLength} caracteres`
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Máximo de ${maxLength} caracteres`
    };
  }

  return { valid: true };
};