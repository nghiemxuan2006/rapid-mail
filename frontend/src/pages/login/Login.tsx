import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { GoogleIcon } from '@/assets/icons'

function Login() {
    const { authCode, error, ready, loading, signInWithGoogle, reset } = useGoogleAuth()

    return (
        <div
            className="min-h-screen grid grid-cols-[minmax(340px,520px)_1fr] max-[960px]:grid-cols-1 gap-[clamp(1.5rem,3vw,3rem)] items-center p-[clamp(1.5rem,2vw,2.5rem)_clamp(1.5rem,4vw,3rem)] text-[#eaf0ff] bg-[#0c1223]"
            style={{
                background: 'linear-gradient(135deg, #0c1223 0%, #141d38 50%, #0c1223 100%)',
            }}
        >
            <div
                className="bg-[rgba(8,12,26,0.8)] border border-white/[0.08] rounded-3xl p-[clamp(1.5rem,2vw,2.5rem)] shadow-2xl text-[#eaf0ff] relative overflow-hidden"
            >
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] font-bold tracking-wide relative z-10">
                    RapidMail
                </div>
                <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] tracking-tight mt-4 mb-2 relative z-10">
                    Đăng nhập để bắt đầu
                </h1>
                <p className="text-[#c6d3ff] max-w-[36ch] leading-relaxed mb-6 relative z-10">
                    Kết nối tài khoản Google để gửi email chiến dịch nhanh chóng và quản lý danh sách
                    liên hệ gọn gàng.
                </p>

                <div className="flex flex-col gap-3 relative z-10">
                    <button
                        className="inline-flex items-center justify-center gap-3 w-full py-3.5 px-4 border border-white/[0.18] rounded-[14px] bg-gradient-to-br from-white to-[#dfe7ff] text-[#0c1024] font-bold cursor-pointer hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-65 disabled:cursor-not-allowed"
                        onClick={signInWithGoogle}
                        disabled={!ready || loading}
                    >
                        <GoogleIcon />
                        <span>{loading ? 'Đang mở Google...' : 'Tiếp tục với Google'}</span>
                    </button>
                    <p className="text-[0.95rem] text-[#9cb0d8]">
                        Chúng tôi dùng OAuth Code Flow. Sau khi nhận mã, backend sẽ trao đổi token an toàn.
                    </p>
                </div>

                {authCode && (
                    <div className="mt-4 rounded-[14px] p-4 border border-[rgba(72,221,134,0.4)] bg-white/[0.04] text-[#eaf0ff] grid gap-2 relative z-10">
                        <div>
                            <strong>Nhận được mã đăng nhập.</strong> Gửi mã này lên backend để xác thực và tạo phiên.
                        </div>
                        <code className="p-2.5 bg-black/35 rounded-lg break-all font-mono">{authCode}</code>
                        <button
                            className="self-start px-3.5 py-2 rounded-lg border border-white/[0.15] bg-transparent text-[#eaf0ff] cursor-pointer hover:border-white/[0.35] hover:text-white"
                            onClick={reset}
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-[14px] p-4 border border-[rgba(255,123,123,0.4)] bg-white/[0.04] text-[#eaf0ff] grid gap-2 relative z-10">
                        <div>
                            <strong>Đăng nhập thất bại:</strong> {error}
                        </div>
                        <button
                            className="self-start px-3.5 py-2 rounded-lg border border-white/[0.15] bg-transparent text-[#eaf0ff] cursor-pointer hover:border-white/[0.35] hover:text-white"
                            onClick={reset}
                        >
                            Thử lại
                        </button>
                    </div>
                )}
            </div>

            <aside
                className="p-[clamp(1.25rem,2vw,2rem)] rounded-3xl border border-white/[0.08] text-[#e9eeff] shadow-2xl min-h-[460px]"
                style={{
                    background: 'linear-gradient(160deg, rgba(30,42,80,0.7) 0%, rgba(12,18,35,0.9) 100%)',
                }}
            >
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.08] text-[#b5c7ff] border border-white/[0.14] font-semibold">
                    Google OAuth ready
                </div>
                <h2 className="text-[clamp(1.5rem,3vw,2.05rem)] tracking-tight mt-4 mb-3">
                    Gửi email chiến dịch nhanh chóng
                </h2>
                <p className="text-[#c4d2ff] leading-relaxed mb-5">
                    RapidMail hỗ trợ cấu hình thông tin người gửi, quản lý liên hệ, và gửi email tự động với
                    trải nghiệm mượt mà.
                </p>
                <ul className="list-none p-0 m-0 grid gap-2.5">
                    <li className="flex items-center gap-2.5 py-3 px-3.5 bg-white/[0.06] rounded-xl border border-white/[0.1] before:content-['•'] before:text-[#7ae0ff] before:text-xl">
                        Đăng nhập một chạm qua Google
                    </li>
                    <li className="flex items-center gap-2.5 py-3 px-3.5 bg-white/[0.06] rounded-xl border border-white/[0.1] before:content-['•'] before:text-[#7ae0ff] before:text-xl">
                        Bảo mật bằng OAuth Code Flow
                    </li>
                    <li className="flex items-center gap-2.5 py-3 px-3.5 bg-white/[0.06] rounded-xl border border-white/[0.1] before:content-['•'] before:text-[#7ae0ff] before:text-xl">
                        Quản lý danh sách nhận tin gọn gàng
                    </li>
                </ul>
            </aside>
        </div>
    )
}

export default Login
