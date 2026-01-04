import { useState } from 'react'
import styles from './Home.module.scss'
import { showNotifications } from '@/utils/showNotification'
import { useAppDispatch } from '@/app/hook'
import { sendMailApi } from '@/features/email/emailApi'

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

// Gmail API expects the RFC 2822 message body to be base64url encoded
function buildRawMessage(to: string, body: string) {
    const subject = 'RapidMail test'
    const messageLines = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body,
    ]
    const message = messageLines.join('\n')
    const base64EncodedEmail = window
        .btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    return base64EncodedEmail
}

function Home() {
    const dispatch = useAppDispatch();

    const [receiver, setReceiver] = useState('')
    const [content, setContent] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async () => {

        if (!receiver.trim()) {
            showNotifications('warning', 'Vui lòng nhập email người nhận')
            return
        }

        if (!content.trim()) {
            showNotifications('warning', 'Vui lòng nhập nội dung email')
            return
        }

        setSending(true)

        try {
            await dispatch(sendMailApi({ receivers: [receiver.trim()], content: content.trim() })).unwrap();
            showNotifications('success', 'Đã gửi email thành công')
            setContent('')
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Gửi email thất bại')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1>Gửi Gmail trực tiếp</h1>
                    <p>
                        Sử dụng access token đã nhận sau bước OAuth (scope gmail.send). Token cần được lưu ở
                        localStorage key <strong>access_token</strong>.
                    </p>
                </div>

                <div className={styles.form}>
                    <label className={styles.field}>
                        <span>Người nhận</span>
                        <input
                            type="email"
                            placeholder="receiver@example.com"
                            value={receiver}
                            onChange={(e) => setReceiver(e.target.value)}
                        />
                    </label>

                    <label className={styles.field}>
                        <span>Nội dung</span>
                        <textarea
                            placeholder="Nhập nội dung email"
                            rows={8}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </label>

                    <div className={styles.actions}>
                        <button onClick={handleSend} disabled={sending}>
                            {sending ? 'Đang gửi...' : 'Gửi email'}
                        </button>
                    </div>

                    <div className={styles.hint}>
                        <strong>Lưu ý:</strong> Nếu nhận lỗi 401/403, hãy chắc rằng token còn hiệu lực, đúng scope và
                        đã được backend trao đổi từ auth code. Gmail API sẽ gửi từ tài khoản đã ủy quyền.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
