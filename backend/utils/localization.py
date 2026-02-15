# backend/utils/localization.py

import re

def to_english_digits(text: str) -> str:
    """
    Converts Persian (۰-۹) and Arabic (٠-٩) digits to English (0-9).
    Useful for normalizing passwords, usernames, and phone numbers.
    """
    if not text:
        return text
        
    # Mapping for Persian and Arabic digits
    translations = str.maketrans(
        '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
        '01234567890123456789'
    )
    return text.translate(translations)

def normalize_phone(phone: str) -> str:
    """
    Standardizes phone numbers to +98 format.
    Accepts: 0912..., 912..., +98912...
    Returns: +989123456789
    """
    if not phone:
        return ""
    
    # 1. Convert to English digits first
    phone = to_english_digits(phone)
    
    # 2. Remove whitespace and non-digit chars (except +)
    phone = re.sub(r'[^\d+]', '', phone)
    
    # 3. Handle formats
    # Case: 0912... -> +98912...
    if phone.startswith('09'):
        return '+98' + phone[1:]
    
    # Case: 912... -> +98912...
    if phone.startswith('9') and len(phone) == 10:
        return '+98' + phone
        
    # Case: 0098... -> +98...
    if phone.startswith('0098'):
        return '+' + phone[2:]
        
    # Case: +98... (Keep as is)
    if phone.startswith('+98'):
        return phone
        
    return phone # Return raw if unrecognized pattern, let validation catch it later