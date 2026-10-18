import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
    base: '/softy-js/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                game: resolve(__dirname, 'game.html'),
            },
        },
    },
})
