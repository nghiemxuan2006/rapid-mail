import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { GoogleIcon } from '@/assets/icons'
import styles from './Login.module.scss'

function Login() {
    const { authCode, error, ready, loading, signInWithGoogle, reset } = useGoogleAuth()

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.brand}>RapidMail</div>
                <h1>Đăng nhập để bắt đầu</h1>
                <p className={styles.lead}>
                    Kết nối tài khoản Google để gửi email chiến dịch nhanh chóng và quản lý danh sách
                    liên hệ gọn gàng.
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.googleBtn}
                        onClick={signInWithGoogle}
                        disabled={!ready || loading}
                    >
                        <GoogleIcon />
                        <span>{loading ? 'Đang mở Google...' : 'Tiếp tục với Google'}</span>
                    </button>
                    <p className={styles.hint}>
                        Chúng tôi dùng OAuth Code Flow. Sau khi nhận mã, backend sẽ trao đổi token an toàn.
                    </p>
                </div>

                {authCode && (
                    <div className={`${styles.status} ${styles.success}`}>
                        <div>
                            <strong>Nhận được mã đăng nhập.</strong> Gửi mã này lên backend để xác thực và tạo phiên.
                        </div>
                        <code>{authCode}</code>
                        <button className={styles.ghost} onClick={reset}>
                            Thử lại
                        </button>
                    </div>
                )}

                {error && (
                    <div className={`${styles.status} ${styles.error}`}>
                        <div>
                            <strong>Đăng nhập thất bại:</strong> {error}
                        </div>
                        <button className={styles.ghost} onClick={reset}>
                            Thử lại
                        </button>
                    </div>
                )}
            </div>

            <aside className={styles.side}>
                <div className={styles.badge}>Google OAuth ready</div>
                <h2>Gửi email chiến dịch nhanh chóng</h2>
                <p>
                    RapidMail hỗ trợ cấu hình thông tin người gửi, quản lý liên hệ, và gửi email tự động với
                    trải nghiệm mượt mà.
                </p>
                <ul>
                    <li>Đăng nhập một chạm qua Google</li>
                    <li>Bảo mật bằng OAuth Code Flow</li>
                    <li>Quản lý danh sách nhận tin gọn gàng</li>
                </ul>
            </aside>
        </div>
    )
}

export default Login