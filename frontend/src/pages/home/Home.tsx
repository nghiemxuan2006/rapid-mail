import { useState } from 'react'
import { showNotifications } from '@/utils/showNotification'
import { useAppDispatch } from '@/app/hook'
import { sendMailApi } from '@/features/email/emailApi'
import { Link } from 'react-router-dom'

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
        <div className="min-h-screen flex items-center justify-center bg-muted p-6 text-foreground">
            <div className="w-full max-w-[820px] bg-card rounded-2xl p-8 shadow-xl flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Gửi Gmail trực tiếp</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Sử dụng access token đã nhận sau bước OAuth (scope gmail.send). Token cần được lưu ở
                        localStorage key <strong>access_token</strong>.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2 font-semibold text-foreground">
                        <span>Người nhận</span>
                        <input
                            type="email"
                            placeholder="receiver@example.com"
                            value={receiver}
                            onChange={(e) => setReceiver(e.target.value)}
                            className="border border-border rounded-lg px-3.5 py-3 text-[15px] font-medium bg-input-background focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                        />
                    </label>

                    <label className="flex flex-col gap-2 font-semibold text-foreground">
                        <span>Nội dung</span>
                        <textarea
                            placeholder="Nhập nội dung email"
                            rows={8}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="border border-border rounded-lg px-3.5 py-3 text-[15px] font-medium bg-input-background focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                        />
                    </label>

                    <div className="flex gap-3 justify-end flex-wrap">
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="bg-primary text-primary-foreground px-4.5 py-3 rounded-lg font-bold cursor-pointer shadow-md hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {sending ? 'Đang gửi...' : 'Gửi email'}
                        </button>
                        <Link
                            to="/email-template"
                            className="bg-primary/80 text-primary-foreground px-4.5 py-3 rounded-lg font-bold no-underline inline-flex items-center gap-1.5 shadow-md hover:-translate-y-px"
                        >
                            Custom Email Builder
                        </Link>
                    </div>

                    <div className="bg-muted border border-dashed border-border rounded-xl px-4 py-3.5 text-muted-foreground leading-relaxed">
                        <strong>Lưu ý:</strong> Nếu nhận lỗi 401/403, hãy chắc rằng token còn hiệu lực, đúng scope và
                        đã được backend trao đổi từ auth code. Gmail API sẽ gửi từ tài khoản đã ủy quyền.
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home
