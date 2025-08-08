export class Utils {
    static showNotification(message, type = 'success', duration = 5000) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `
        <i class="icon ${type === 'error' ? 'icon-error': 'icon-success'}"></i>
        <div>${message}</div>
        `;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, duration);
    }

    static showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    }

    static showSuccess(message, duration = 5000) {
        this.showNotification(message, 'success', duration);
    }

    static formatTime(date) {
        if (!date || !(date instanceof Date)) return '';
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
// إضافة دالة التاريخ
static formatDate(date) {
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
    static formatPhoneNumber(phone, defaultCountry = 'YE') {
        try {
            const phoneUtil = libphonenumber.parsePhoneNumberFromString(phone, defaultCountry);
            if (phoneUtil && phoneUtil.isValid()) {
                return phoneUtil.formatInternational(); // مثل: +967 712 345 678
            } else {
                return phone;
            }
        } catch (e) {
            return phone;
        }
    }
}
