import {
    AuthService
} from './auth.js';
import {
    ChatService
} from './chat.js';
import {
    Utils
} from './utils.js';
import {
    auth,
    RecaptchaVerifier
} from './firebase-init.js';

class LynqChatApp {
    constructor() {
        this.confirmationResult = null;
        this.registrationConfirmation = null;
        this.recaptchaVerifier = null;
        this.unsubscribe = null;
        this.currentUser = null;
        this.replyingTo = null; // متغير لتخزين الرسالة التي يتم الرد عليها

        // ربط الدوال بالسياق الحالي
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        this.initRouter();
        this.initEventListeners();
        this.checkAuthState();
        this.initServiceWorker();
        this.initSidebar();
    }

    async initRouter() {
        window.addEventListener('hashchange', () => this.loadView(window.location.hash));

        if (!window.location.hash) {
            window.location.hash = '#login';
        } else {
            await this.loadView(window.location.hash);
        }
    }

    async loadView(hash) {
        const appElement = document.getElementById('app');
        const view = hash.substring(1);
        const validViews = [
            'login',
            'chat',
            'register',
            'settings',
            'privacy',
            'notifications',
            'about',
            'profile',
            'contacts',
            'media'
        ];

        if (!validViews.includes(view)) {
            appElement.innerHTML = '<h1>404 - الصفحة غير موجودة</h1>';
            return;
        }
        document.getElementById('welcomeScreen')?.classList.add('hidden');
        // تحقق من حالة المستخدم
        if (!this.currentUser && view !== 'login' && view !== 'register') {
            window.location.hash = '#login';
            return;
        }

        try {
            const response = await fetch(`/assets/views/${view}.html`);
            if (!response.ok) throw new Error('Failed to load view');

            const html = await response.text();
            appElement.innerHTML = html;

            // تنظيف الاشتراكات السابقة
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }

            // تحديث العنصر النشط في الشريط الجانبي
            this.updateSidebarActiveItem(view);

            // تهيئة منطق خاص بالواجهة
            switch (view) {
                case 'chat':
                    await this.initChat();
                    break;
                case 'settings':
                    this.initSettings();
                    break;
                case 'profile':
                    await this.initProfile();
                    break;
                case 'contacts':
                    await this.initContacts();
                    break;
                case 'media':
                    await this.initMedia();
                    break;
            }
        } catch (error) {
            console.error('View loading error:', error);
            appElement.innerHTML = `
            <div class="error-container">
            <h1>خطأ في تحميل الصفحة</h1>
            <p>${error.message}</p>
            <button onclick="window.location.reload()">إعادة تحميل</button>
            </div>
            `;
        }
    }

    // تهيئة reCAPTCHA
    initRecaptcha(containerId) {
        try {
            // تنظيف أي نسخ سابقة
            this.resetRecaptcha();

            // التحقق من وجود الحاوية في DOM
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`reCAPTCHA container not found: ${containerId}`);
                return;
            }

            // إعادة تهيئة reCAPTCHA
            this.recaptchaVerifier = new RecaptchaVerifier(containerId, {
                'size': 'invisible',
                'callback': (response) => {
                    console.log('reCAPTCHA solved:', response);
                }
            }, auth);
        } catch (error) {
            console.error('Recaptcha initialization error:', error);
            Utils.showError('حدث خطأ في تهيئة reCAPTCHA');
        }
    }

    // تنظيف reCAPTCHA
    resetRecaptcha() {
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.warn('Recaptcha cleanup error:', e);
            }
            this.recaptchaVerifier = null;
        }
    }

    initEventListeners() {
        document.addEventListener('click', this.handleClick);
        document.addEventListener('keypress', this.handleKeyPress);
    }

    async handleClick(e) {
        try {
            if (e.target.id === 'login-btn') {
                await this.handleLogin();
            } else if (e.target.id === 'logout-btn') {
                await AuthService.logout();
            } else if (e.target.id === 'register-btn') {
                await this.handleRegistration();
            } else if (e.target.id === 'send-otp-btn') {
                await this.initiatePhoneLogin();
            } else if (e.target.id === 'verify-otp-btn') {
                await this.verifySMSCode();
            } else if (e.target.id === 'phone-login-link') {
                this.toggleLoginMethod('phone');
            } else if (e.target.id === 'email-login-link') {
                this.toggleLoginMethod('email');
            } else if (e.target.id === 'delete-account') {
                await this.handleAccountDeletion();
            } else if (e.target.id === 'send-btn') {
                await this.sendMessage();
            } else if (e.target.id === 'send-reg-otp-btn') {
                await this.initiatePhoneRegistration();
            } else if (e.target.id === 'verify-reg-otp-btn') {
                await this.verifyRegistrationCode();
            } else if (e.target.id === 'phone-register-link') {
                this.toggleRegisterMethod('phone');
            } else if (e.target.id === 'email-register-link') {
                this.toggleRegisterMethod('email');
            } else if (e.target.id === 'settings-btn') {
                window.location.hash = '#settings';
            } else if (e.target.id === 'resend-link') {
                this.handleResendOTP();
            } else if (e.target.id === 'reg-resend-link') {
                this.handleResendRegOTP();
            } else if (e.target.id === 'save-profile') {
                await this.saveProfile();
            }
        } catch (error) {
            Utils.showError(error.message);
        }
    }

    async handleKeyPress(e) {
        if (e.key === 'Enter' && e.target.id === 'message-input') {
            await this.sendMessage();
        }
    }

    initSidebar() {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                if (href) {
                    window.location.hash = href;
                }
            });
        });
    }

    updateSidebarActiveItem(view) {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => item.classList.remove('active'));

        const activeItem = Array.from(sidebarItems).find(item =>
            item.getAttribute('href') === `#${view}`);

        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            throw new Error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        }

        await AuthService.login(email, password);
        Utils.showSuccess('تم تسجيل الدخول بنجاح');
        window.location.hash = '#chat';
    }

    async handleRegistration() {
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        if (!email || !password || !confirm) {
            throw new Error('الرجاء ملء جميع الحقول');
        }

        if (password !== confirm) {
            throw new Error('كلمة المرور غير متطابقة');
        }

        if (password.length < 6) {
            throw new Error('كلمة المرور يجب أن تكون على الأقل 6 أحرف');
        }

        await AuthService.register(email, password);
        Utils.showSuccess('تم إنشاء الحساب بنجاح!');
        window.location.hash = '#chat';
    }

    toggleLoginMethod(method) {
        this.resetRecaptcha();

        if (method === 'phone') {
            document.getElementById('email-login').classList.add('hidden');
            document.getElementById('phone-login').classList.remove('hidden');
        } else {
            document.getElementById('phone-login').classList.add('hidden');
            document.getElementById('email-login').classList.remove('hidden');
        }
    }

    toggleRegisterMethod(method) {
        this.resetRecaptcha();

        if (method === 'phone') {
            document.getElementById('email-register').classList.add('hidden');
            document.getElementById('phone-register').classList.remove('hidden');
        } else {
            document.getElementById('phone-register').classList.add('hidden');
            document.getElementById('email-register').classList.remove('hidden');
        }
    }

    async initiatePhoneLogin() {
        const phoneNumber = document.getElementById('phone').value.trim();

        if (!phoneNumber) {
            throw new Error('الرجاء إدخال رقم الجوال');
        }

        try {
            // إعادة تهيئة reCAPTCHA في كل مرة
            this.initRecaptcha('recaptcha-container');

            if (!this.recaptchaVerifier) {
                throw new Error('فشل تهيئة التحقق، يرجى المحاولة مرة أخرى');
            }

            this.confirmationResult = await AuthService.loginWithPhone(phoneNumber, this.recaptchaVerifier);
            document.getElementById('otp-section').classList.remove('hidden');
            Utils.showSuccess('تم إرسال رمز التحقق إلى جوالك');
            this.startResendTimer('resend-timer', 'resend-link');
        } catch (error) {
            Utils.showError(error.message);
            this.resetRecaptcha(); // إعادة التعيين في حالة الخطأ
        }
    }

    async initiatePhoneRegistration() {
        const phoneNumber = document.getElementById('reg-phone').value.trim();

        if (!phoneNumber) {
            throw new Error('الرجاء إدخال رقم الجوال');
        }

        try {
            // إعادة تهيئة reCAPTCHA في كل مرة
            this.initRecaptcha('reg-recaptcha-container');

            if (!this.recaptchaVerifier) {
                throw new Error('فشل تهيئة التحقق، يرجى المحاولة مرة أخرى');
            }

            this.registrationConfirmation = await AuthService.registerWithPhone(phoneNumber, this.recaptchaVerifier);
            document.getElementById('reg-otp-section').classList.remove('hidden');
            Utils.showSuccess('تم إرسال رمز التحقق إلى جوالك');
            this.startResendTimer('reg-resend-timer', 'reg-resend-link');
        } catch (error) {
            Utils.showError(error.message);
            this.resetRecaptcha(); // إعادة التعيين في حالة الخطأ
        }
    }

    startResendTimer(timerId, linkId) {
        let countdown = 60;
        const timerElement = document.getElementById(timerId);
        const resendLink = document.getElementById(linkId);

        if (!timerElement || !resendLink) return;

        timerElement.classList.remove('hidden');
        resendLink.classList.add('hidden');

        const timer = setInterval(() => {
            timerElement.textContent = `إعادة الإرسال متاحة بعد ${countdown} ثانية`;
            countdown--;

            if (countdown <= 0) {
                clearInterval(timer);
                timerElement.classList.add('hidden');
                resendLink.classList.remove('hidden');
            }
        }, 1000);
    }

    async verifySMSCode() {
        const code = document.getElementById('otp').value.trim();

        if (!code || code.length !== 6) {
            throw new Error('الرجاء إدخال رمز التحقق المكون من 6 أرقام');
        }

        try {
            await AuthService.verifySMSCode(this.confirmationResult, code);
            Utils.showSuccess('تم تسجيل الدخول بنجاح!');
            window.location.hash = '#chat';
        } catch (error) {
            Utils.showError(error.message);
        } finally {
            this.resetRecaptcha(); // تنظيف بعد الاستخدام
        }
    }

    async verifyRegistrationCode() {
        const code = document.getElementById('reg-otp').value.trim();

        if (!code || code.length !== 6) {
            throw new Error('الرجاء إدخال رمز التحقق المكون من 6 أرقام');
        }

        try {
            await AuthService.verifyPhoneRegistration(this.registrationConfirmation, code);
            Utils.showSuccess('تم إنشاء الحساب بنجاح!');
            window.location.hash = '#chat';
        } catch (error) {
            Utils.showError(error.message);
        } finally {
            this.resetRecaptcha(); // تنظيف بعد الاستخدام
        }
    }

    async initChat() {
        this.currentUser = auth.currentUser;
        if (!this.currentUser) return;

        // تحديث عنوان الدردشة
        const chatTitle = document.getElementById('chat-title-text');
        if (chatTitle) {
            chatTitle.textContent = `LynqChat - ${this.currentUser.email || this.currentUser.phoneNumber}`;
        }

        // تهيئة مؤشر الكتابة
        this.initTypingIndicator();

        // تهيئة إرسال الوسائط
        this.initMediaUpload();

        // تهيئة البحث في المحادثة
        this.initSearch();

        // الاشتراك في رسائل الدردشة
        this.unsubscribe = ChatService.subscribeToChat('general', (messages) => {
            const chatContainer = document.getElementById('chat-messages');
            if (!chatContainer) return;

            chatContainer.innerHTML = messages.map(msg => {
                const isCurrentUser = msg.senderId === this.currentUser.uid;
                const formattedTime = Utils.formatTime(msg.timestamp?.toDate());
                const statusIcon = msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓' : '';

                let messageContent;
                switch (msg.type) {
                    case 'image':
                        messageContent = `
                            <div class="media-message">
                                <img src="${msg.content}" alt="صورة">
                            </div>
                        `;
                        break;
                    case 'video':
                        messageContent = `
                            <div class="media-message">
                                <video controls>
                                    <source src="${msg.content}" type="video/mp4">
                                    متصفحك لا يدعم تشغيل الفيديو
                                </video>
                            </div>
                        `;
                        break;
                    case 'document':
                        messageContent = `
                            <div class="document-message">
                                <i class="icon icon-document"></i>
                                <div class="document-info">
                                    <div class="document-name">${msg.metadata.name}</div>
                                    <small class="document-size">${ChatService.formatFileSize(msg.metadata.size)}</small>
                                </div>
                            </div>
                        `;
                        break;
                    default:
                        messageContent = `<div class="message-content">${this.decodeMessage(msg.content)}</div>`;
                }

                return `
                    <div class="message ${isCurrentUser ? 'sent' : 'received'}" data-id="${msg.id}">
                        ${messageContent}
                        <small class="message-time">
                            ${formattedTime}
                            ${isCurrentUser ? `<span class="message-status ${msg.status === 'read' ? 'read' : ''}">${statusIcon}</span>` : ''}
                        </small>
                        <div class="message-actions">
                            <button class="message-action" data-action="reply" title="رد">
                                <i class="icon icon-reply"></i>
                            </button>
                            <button class="message-action" data-action="delete" title="حذف">
                                <i class="icon icon-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // تحديد الرسائل غير المقروءة وتحديث حالتها
            messages
                .filter(msg => !msg.isRead && msg.senderId !== this.currentUser.uid)
                .forEach(msg => {
                    ChatService.markAsRead(msg.id);
                });

            // التمرير إلى أحدث رسالة
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });

        // إضافة مستمعين لأحداث الرسائل
        document.getElementById('chat-messages').addEventListener('click', (e) => {
            const messageAction = e.target.closest('.message-action');
            if (!messageAction) return;

            const messageElement = e.target.closest('.message');
            const messageId = messageElement.dataset.id;
            const action = messageAction.dataset.action;

            if (action === 'delete') {
                this.deleteMessage(messageId);
            } else if (action === 'reply') {
                this.replyToMessage(messageId);
            }
        });
    }

    initTypingIndicator() {
        const messageInput = document.getElementById('message-input');
        const typingIndicator = document.getElementById('typing-indicator');
        let typingTimeout;

        messageInput.addEventListener('input', () => {
            // في تطبيق حقيقي، هنا نرسل إشارة الكتابة إلى Firebase Realtime Database
            typingIndicator.classList.remove('hidden');
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingIndicator.classList.add('hidden');
            }, 2000);
        });
    }

    initMediaUpload() {
        const attachBtn = document.getElementById('attach-btn');
        const mediaModal = document.getElementById('media-modal');
        const closeMediaModal = document.getElementById('close-media-modal');
        const mediaOptions = ['send-image', 'send-video', 'send-document'];
        const mediaPreview = document.getElementById('media-preview');
        const cancelMedia = document.getElementById('cancel-media');
        const confirmMedia = document.getElementById('confirm-media');
        let selectedFile = null;

        // فتح/إغلاق نافذة الوسائط
        attachBtn.addEventListener('click', () => mediaModal.classList.remove('hidden'));
        closeMediaModal.addEventListener('click', () => {
            mediaModal.classList.add('hidden');
            mediaPreview.classList.add('hidden');
            selectedFile = null;
        });

        // اختيار نوع الوسائط
        mediaOptions.forEach(option => {
            const btn = document.getElementById(option);
            if (btn) {
                btn.addEventListener('click', () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    
                    if (option === 'send-image') {
                        input.accept = 'image/*';
                    } else if (option === 'send-video') {
                        input.accept = 'video/*';
                    } else if (option === 'send-document') {
                        input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                    }

                    input.onchange = async (e) => {
                        if (e.target.files.length) {
                            selectedFile = e.target.files[0];
                            this.previewMedia(selectedFile, option.replace('send-', ''));
                        }
                    };
                    
                    input.click();
                });
            }
        });

        // تأكيد إرسال الوسائط
        confirmMedia.addEventListener('click', async () => {
            if (!selectedFile) return;

            try {
                const user = auth.currentUser;
                if (!user) throw new Error('يجب تسجيل الدخول أولاً');

                Utils.showNotification('جاري تحميل الملف...', 'info');
                
                const fileUrl = await ChatService.uploadMedia(selectedFile);
                const metadata = {
                    name: selectedFile.name,
                    size: selectedFile.size,
                    type: selectedFile.type
                };

                await ChatService.sendMessage(
                    user.uid, 
                    'general', 
                    fileUrl, 
                    selectedFile.type.startsWith('image/') ? 'image' : 
                    selectedFile.type.startsWith('video/') ? 'video' : 'document',
                    metadata
                );

                mediaPreview.classList.add('hidden');
                mediaModal.classList.add('hidden');
                selectedFile = null;
            } catch (error) {
                Utils.showError(error.message);
            }
        });

        // إلغاء إرسال الوسائط
        cancelMedia.addEventListener('click', () => {
            mediaPreview.classList.add('hidden');
            selectedFile = null;
        });
    }

    previewMedia(file, type) {
        const mediaPreview = document.getElementById('media-preview');
        const previewImage = document.getElementById('preview-image');
        const previewVideo = document.getElementById('preview-video');
        const previewDocument = document.getElementById('preview-document');
        const documentName = document.getElementById('document-name');
        const documentSize = document.getElementById('document-size');

        // إخفاء جميع معاينات الوسائط
        previewImage.classList.add('hidden');
        previewVideo.classList.add('hidden');
        previewDocument.classList.add('hidden');

        if (type === 'image') {
            previewImage.src = URL.createObjectURL(file);
            previewImage.classList.remove('hidden');
        } else if (type === 'video') {
            previewVideo.src = URL.createObjectURL(file);
            previewVideo.classList.remove('hidden');
        } else if (type === 'document') {
            documentName.textContent = file.name;
            documentSize.textContent = ChatService.formatFileSize(file.size);
            previewDocument.classList.remove('hidden');
        }

        mediaPreview.classList.remove('hidden');
    }

    initSearch() {
        const searchBtn = document.getElementById('search-btn');
        const searchModal = document.getElementById('search-modal');
        const closeSearchModal = document.getElementById('close-search-modal');
        const searchInput = document.getElementById('search-input');
        const searchSubmit = document.getElementById('search-submit');
        const searchResults = document.getElementById('search-results');

        searchBtn.addEventListener('click', () => searchModal.classList.remove('hidden'));
        closeSearchModal.addEventListener('click', () => {
            searchModal.classList.add('hidden');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });

        const performSearch = async () => {
            const queryText = searchInput.value.trim();
            if (!queryText) return;

            try {
                const results = await ChatService.searchMessages('general', queryText);
                
                searchResults.innerHTML = results.map(msg => {
                    const content = msg.type === 'text' ? this.decodeMessage(msg.content) : 
                                  `[${msg.type === 'image' ? 'صورة' : msg.type === 'video' ? 'فيديو' : 'ملف'}]`;
                    const time = Utils.formatTime(msg.timestamp?.toDate());

                    return `
                        <div class="search-result" data-id="${msg.id}">
                            <div class="search-content">${content}</div>
                            <div class="search-time">${time}</div>
                        </div>
                    `;
                }).join('') || '<div class="no-results">لا توجد نتائج</div>';
            } catch (error) {
                Utils.showError(error.message);
            }
        };

        searchSubmit.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        // الانتقال إلى الرسالة عند النقر على نتيجة البحث
        searchResults.addEventListener('click', (e) => {
            const searchResult = e.target.closest('.search-result');
            if (!searchResult) return;

            const messageId = searchResult.dataset.id;
            const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
            
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                messageElement.classList.add('highlight');
                setTimeout(() => messageElement.classList.remove('highlight'), 2000);
            }
            
            searchModal.classList.add('hidden');
        });
    }

    async deleteMessage(messageId) {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        
        try {
            await ChatService.deleteMessage(messageId);
            Utils.showSuccess('تم حذف الرسالة بنجاح');
        } catch (error) {
            Utils.showError(error.message);
        }
    }

    replyToMessage(messageId) {
        const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
        if (!messageElement) return;

        const messageContent = messageElement.querySelector('.message-content').textContent;
        
        // قص المحتوى إذا كان طويلاً
        const previewContent = messageContent.length > 30 ? 
            messageContent.substring(0, 30) + '...' : messageContent;
        
        // إضافة معاينة الرد
        const replyPreview = document.createElement('div');
        replyPreview.id = 'reply-preview';
        replyPreview.innerHTML = `
            <div class="reply-header">
                <span>رد على:</span>
                <button id="cancel-reply">&times;</button>
            </div>
            <div class="reply-content">${previewContent}</div>
        `;
        
        document.querySelector('.message-input-container')
            .insertBefore(replyPreview, document.getElementById('message-input'));
        
        // إضافة مستمع لإلغاء الرد
        document.getElementById('cancel-reply').addEventListener('click', () => {
            this.replyingTo = null;
            replyPreview.remove();
        });
        
        // تخزين الرد للاستخدام عند الإرسال
        this.replyingTo = messageId;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('يجب تسجيل الدخول أولاً');

            const encrypted = this.encodeMessage(message);
            await ChatService.sendMessage(
                user.uid, 
                'general', 
                encrypted,
                'text',
                {},
                this.replyingTo // إضافة معلمة الرد
            );
            
            input.value = '';
            
            // إزالة معاينة الرد بعد الإرسال
            if (this.replyingTo) {
                this.replyingTo = null;
                document.getElementById('reply-preview')?.remove();
            }
        } catch (error) {
            Utils.showError(error.message);
        }
    }

    initSettings() {
        const selfDestructSetting = localStorage.getItem('selfDestruct') || '0';
        const selfDestructSelect = document.getElementById('self-destruct');

        if (selfDestructSelect) {
            selfDestructSelect.value = selfDestructSetting;

            selfDestructSelect.addEventListener('change', (e) => {
                localStorage.setItem('selfDestruct', e.target.value);
                Utils.showSuccess('تم حفظ الإعدادات');
            });
        }
    }

    async handleAccountDeletion() {
        if (!confirm('هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        try {
            await AuthService.deleteAccount();
            Utils.showSuccess('تم حذف الحساب بنجاح');
            window.location.hash = '#login';
        } catch (error) {
            Utils.showError(error.message);
        }
    }

    encodeMessage(message) {
        return btoa(unescape(encodeURIComponent(message)));
    }

    decodeMessage(encoded) {
        return decodeURIComponent(escape(atob(encoded)));
    }

    async initProfile() {
        const user = auth.currentUser;
        if (user) {
            const displayNameInput = document.getElementById('display-name');
            const profileImg = document.getElementById('profile-img');
            
            if (displayNameInput) {
                displayNameInput.value = user.displayName || '';
            }
            
            if (profileImg) {
                profileImg.src = user.photoURL || '/assets/default-profile.jpg';
            }
            
            // إضافة مستمع لرفع الصورة الشخصية
            document.getElementById('profile-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        Utils.showNotification('جاري تحديث الصورة...', 'info');
                        const url = await ChatService.uploadMedia(file);
                        await AuthService.updateProfile(null, url);
                        profileImg.src = url;
                        Utils.showSuccess('تم تحديث الصورة بنجاح');
                    } catch (error) {
                        Utils.showError(error.message);
                    }
                }
            });
        }
    }

    async saveProfile() {
        const displayName = document.getElementById('display-name').value.trim();
        if (displayName) {
            try {
                await AuthService.updateProfile(displayName, null);
                Utils.showSuccess('تم تحديث الملف الشخصي');
            } catch (error) {
                Utils.showError(error.message);
            }
        }
    }

    async initContacts() {
        // يمكنك إضافة منطق جلب جهات الاتصال هنا لاحقًا
    }

    async initMedia() {
        // يمكنك إضافة منطق جلب الوسائط هنا لاحقًا
    }

    checkAuthState() {
        auth.onAuthStateChanged(user => {
            const welcomeScreen = document.getElementById('welcomeScreen');
            const sidebar = document.getElementById('sidebar');
            const appLayout = document.getElementById('appLayout');

            if (user) {
                // حالة تسجيل الدخول
                if (welcomeScreen) welcomeScreen.classList.add('hidden');
                if (sidebar) sidebar.classList.remove('hidden');
                if (appLayout) appLayout.classList.remove('hidden');
                this.currentUser = user;

                // توجيه إلى صفحة الدردشة إذا كان في صفحة تسجيل دخول
                if (window.location.hash === '#login' || window.location.hash === '#register') {
                    window.location.hash = '#chat';
                }
            } else {
                // حالة غير مسجل دخول
                if (welcomeScreen) welcomeScreen.classList.remove('hidden');
                if (sidebar) sidebar.classList.add('hidden');
                if (appLayout) appLayout.classList.add('hidden');
                this.currentUser = null;

                // توجيه إلى صفحة تسجيل الدخول إذا لم يكن فيها
                if (window.location.hash !== '#login' && window.location.hash !== '#register') {
                    window.location.hash = '#login';
                }
            }
        });
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    registration => console.log('ServiceWorker registration successful'),
                    err => console.log('ServiceWorker registration failed: ', err)
                );
            });
        }
    }

    handleResendOTP() {
        const phoneNumber = document.getElementById('phone').value.trim();
        if (!phoneNumber) {
            Utils.showError('الرجاء إدخال رقم الجوال أولاً');
            return;
        }

        this.initiatePhoneLogin();
    }

    handleResendRegOTP() {
        const phoneNumber = document.getElementById('reg-phone').value.trim();
        if (!phoneNumber) {
            Utils.showError('الرجاء إدخال رقم الجوال أولاً');
            return;
        }

        this.initiatePhoneRegistration();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new LynqChatApp();
});