// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', { singleline: 3 }],
    '@stylistic/quotes': ['error', 'single', {
      allowTemplateLiterals: 'always',
      avoidEscape: false,
      ignoreStringLiterals: false
    }],
    '@stylistic/comma-dangle': ['error', 'never'],
    '@stylistic/semi': ['error', 'never']
  }
}).append({
  ignores: [
    'generated/**'
  ]
})
