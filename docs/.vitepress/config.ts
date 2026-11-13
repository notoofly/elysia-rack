import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'elysia-rack Documentation',
  titleTemplate: ':title - elysia-rack',
  description:
    'Model-driven CRUD rack for Elysia: REST + QUERY routes, validation, authorization, OpenAPI metadata, and a React panel.',
  base: '/elysia-rack/docs/',
  lang: 'en-US',
  lastUpdated: true,
  ignoreDeadLinks: [/LICENSE/],

  head: [
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting started', link: '/getting-started/' },
      { text: 'Landing page', link: '/../' },
      { text: 'GitHub', link: 'https://github.com/notoofly/elysia-rack' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting started', link: '/getting-started/' },
          ],
        },
        {
          text: 'Installation',
          items: [
            { text: 'Installation', link: '/installation/' },
            { text: 'Prerequisites', link: '/installation/prerequisites/' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Configuration overview', link: '/configuration/' },
            { text: 'Configuration reference', link: '/configuration/configuration-reference/' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Basic usage', link: '/guides/basic-usage/' },
            { text: 'Common workflows', link: '/guides/common-workflows/' },
            { text: 'Advanced usage', link: '/guides/advanced-usage/' },
          ],
        },
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common issues', link: '/troubleshooting/common-issues/' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'FAQ', link: '/faq/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/notoofly/elysia-rack' },
    ],

    editLink: {
      pattern: 'https://github.com/notoofly/elysia-rack/edit/docs/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © notoofly',
    },
  },
})
