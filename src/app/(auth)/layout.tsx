export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #EBF5FF 0%, #F3F6FB 50%, #F3FAF7 100%)' }}>
      {children}
    </div>
  )
}
