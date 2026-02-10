import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                whatsapp: {
                    green: '#00a884',
                    teal: '#008069',
                    bg: '#efeae2',
                    sent: '#d9fdd3',
                    received: '#ffffff',
                }
            },
        },
    },
    plugins: [],
};
export default config;
