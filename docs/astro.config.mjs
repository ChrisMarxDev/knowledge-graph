import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import knowledgeReference from './scripts/reference.mjs';

export default defineConfig({
  site: 'https://chrismarxdev.github.io',
  base: '/knowledge-graph',
  trailingSlash: 'always',
  integrations: [
    knowledgeReference(),
    starlight({
      title: 'kw',
      description: 'A little more connected. Local knowledge for agents and humans.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/ChrisMarxDev/knowledge-graph' }],
      editLink: { baseUrl: 'https://github.com/ChrisMarxDev/knowledge-graph/edit/main/docs/' },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'Introduction', slug: '' },
        { label: 'Getting started', slug: 'guides/getting-started' },
        { label: 'CLI workflows', slug: 'guides/workflows' },
        { label: 'CLI API reference', slug: 'reference/cli' },
        { label: 'Keeping docs current', slug: 'guides/documentation' },
      ],
    }),
  ],
});
