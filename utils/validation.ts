export function validateEmail(email: string): boolean {
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
}

export function validatePhone(phone: string): boolean {
    const regex = /^(\+\d{1,3}( )?)?\d{10}$/;
    return regex.test(phone);
}

export function validateDate(date: string): boolean {
    const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
    return regex.test(date);
}