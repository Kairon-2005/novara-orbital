import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Novara design system
        blue: {
          DEFAULT: '#1A56DB',
          hover:   '#1748C0',
          50:      '#EBF5FF',
          100:     '#DBEAFE',
        },
        green: {
          DEFAULT: '#057A55',
          50:      '#F3FAF7',
        },
        amber: {
          DEFAULT: '#B45309',
          50:      '#FFFBEB',
        },
        red: {
          DEFAULT: '#E02424',
          50:      '#FDF2F2',
        },
        bg:     '#F3F6FB',
        border: '#E5E7EB',
        t900:   '#111928',
        t700:   '#374151',
        t500:   '#6B7280',
        t300:   '#9CA3AF',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        cn:      ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}

export default config
