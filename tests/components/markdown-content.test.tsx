import { describe, expect, it } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownContent } from '@/components/markdown-content';

describe('MarkdownContent Renderer', () => {
  it('renders headings, bold text, and ordered lists with indented continuations cleanly', () => {
    const sample = [
      'Sugarcane juice is **not recommended** for individuals with diabetes.',
      '',
      '### Why Sugarcane Juice Poses a Risk for Diabetics',
      '',
      '1. **Extremely High Glycemic Index (GI) and Load:**',
      '   Although sugarcane juice is natural, it contains virtually no fiber.',
      '',
      '2. **High Carbohydrate Density:**',
      '   A single glass contains **30 to 50 grams of sugar**.',
    ].join('\n');

    const html = renderToStaticMarkup(React.createElement(MarkdownContent, { content: sample }));

    expect(html).toContain('<strong');
    expect(html).toContain('not recommended</strong>');
    expect(html).toContain('<h3');
    expect(html).toContain('Why Sugarcane Juice Poses a Risk for Diabetics</h3>');
    expect(html).toContain('<ol');
    expect(html).toContain('Extremely High Glycemic Index (GI) and Load:</strong>');
    expect(html).toContain('30 to 50 grams of sugar</strong>');
    expect(html).not.toContain('**not recommended**');
    expect(html).not.toContain('### Why');
  });

  it('renders unordered lists, inline code, and safe external links while suppressing javascript: links', () => {
    const sample = [
      '- Check `E211` in [EFSA Opinion](https://www.efsa.europa.eu/en)',
      '- Ignore unsafe [Click here](javascript:alert(1))',
    ].join('\n');

    const html = renderToStaticMarkup(React.createElement(MarkdownContent, { content: sample }));

    expect(html).toContain('<ul');
    expect(html).toContain('<code');
    expect(html).toContain('E211</code>');
    expect(html).toContain('href="https://www.efsa.europa.eu/en"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('javascript:alert');
    expect(html).toContain('Click here');
  });
});
