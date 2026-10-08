import { useState, useMemo } from 'react'
import { DownloadSimple, FileText, Printer } from '@phosphor-icons/react'
import { DOCUMENTATION_MD } from '../docs/documentation.js'
import { PageHeader, Panel, Button, usePageTitle } from '../components/ui.jsx'

// Helper to convert the markdown string to standalone styled HTML for download
function markdownToHtml(md) {
  const lines = md.split('\n')
  let html = ''
  let inCode = false
  let codeLang = ''
  let codeBuffer = []
  let inTable = false
  let tableHeader = []
  let tableRows = []
  let inList = false
  let listType = 'ul'

  const parseInline = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:12px;color:#0f172a;">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#0a0a0a;text-decoration:underline;">$1</a>')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block toggle
    if (line.startsWith('```')) {
      if (inCode) {
        html += `<pre style="background:#0f172a;color:#f8fafc;padding:14px 18px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:13px;line-height:1.45;margin:16px 0;"><code>${codeBuffer.join('\n')}</code></pre>`
        codeBuffer = []
        inCode = false
      } else {
        inCode = true
        codeLang = line.slice(3).trim()
      }
      continue
    }

    if (inCode) {
      codeBuffer.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
      continue
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.trim().split('|').slice(1, -1).map(c => c.trim())
      if (!inTable) {
        inTable = true
        tableHeader = cells
        tableRows = []
      } else if (line.includes('---')) {
        // separator row, skip
      } else {
        tableRows.push(cells)
      }
      continue
    } else if (inTable) {
      // Flush table
      html += '<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;border:1px solid #cbd5e1;">'
      html += '<thead style="background:#f1f5f9;"><tr>'
      tableHeader.forEach(h => {
        html += `<th style="border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-weight:600;color:#0f172a;">${parseInline(h)}</th>`
      })
      html += '</tr></thead><tbody>'
      tableRows.forEach(row => {
        html += '<tr>'
        row.forEach(c => {
          html += `<td style="border:1px solid #cbd5e1;padding:8px 12px;color:#334155;">${parseInline(c)}</td>`
        })
        html += '</tr>'
      })
      html += '</tbody></table>'
      inTable = false
      tableHeader = []
      tableRows = []
    }

    // Unordered / Ordered Lists
    const isUl = line.match(/^(\s*)[-*]\s+(.*)/)
    const isOl = line.match(/^(\s*)\d+\.\s+(.*)/)
    if (isUl || isOl) {
      const content = isUl ? isUl[2] : isOl[2]
      const curType = isUl ? 'ul' : 'ol'
      if (!inList) {
        inList = true
        listType = curType
        html += `<${listType} style="margin:12px 0 12px 24px;padding:0;color:#334155;">`
      }
      html += `<li style="margin-bottom:6px;">${parseInline(content)}</li>`
      continue
    } else if (inList) {
      html += `</${listType}>`
      inList = false
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1 style="color:#0f172a;font-size:26px;border-bottom:2px solid #0a0a0a;padding-bottom:10px;margin-top:28px;">${parseInline(line.slice(2))}</h1>`
      continue
    }
    if (line.startsWith('## ')) {
      html += `<h2 style="color:#0f172a;font-size:20px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:24px;">${parseInline(line.slice(3))}</h2>`
      continue
    }
    if (line.startsWith('### ')) {
      html += `<h3 style="color:#1e293b;font-size:16px;margin-top:18px;">${parseInline(line.slice(4))}</h3>`
      continue
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      html += `<blockquote style="border-left:4px solid #0a0a0a;background:#f8fafc;padding:10px 16px;margin:14px 0;color:#334155;border-radius:0 6px 6px 0;">${parseInline(line.slice(2))}</blockquote>`
      continue
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      html += '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />'
      continue
    }

    // Regular paragraph
    if (line.trim().length > 0) {
      html += `<p style="margin:10px 0;color:#334155;line-height:1.6;">${parseInline(line)}</p>`
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CyberSentinel — Technical Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; line-height: 1.6; padding: 40px 20px; margin: 0; }
    .doc-container { max-width: 960px; margin: 0 auto; background: #ffffff; }
    @media print { body { padding: 0; background: #fff; color: #000; } hr { display: none; } }
  </style>
</head>
<body>
  <div class="doc-container">
    ${html}
  </div>
</body>
</html>`
}

// React Markdown parser for in-app viewing
function MarkdownViewer({ markdown }) {
  const blocks = useMemo(() => {
    const lines = markdown.split('\n')
    const parsed = []
    let inCode = false
    let codeBuffer = []
    let inTable = false
    let tableHeader = []
    let tableRows = []
    let inList = false
    let listItems = []
    let listIsOl = false

    const flushList = () => {
      if (inList) {
        parsed.push({ type: listIsOl ? 'ol' : 'ul', items: [...listItems] })
        listItems = []
        inList = false
      }
    }

    const flushTable = () => {
      if (inTable) {
        parsed.push({ type: 'table', header: [...tableHeader], rows: [...tableRows] })
        tableHeader = []
        tableRows = []
        inTable = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code blocks
      if (line.startsWith('```')) {
        flushList()
        flushTable()
        if (inCode) {
          parsed.push({ type: 'code', text: codeBuffer.join('\n') })
          codeBuffer = []
          inCode = false
        } else {
          inCode = true
        }
        continue
      }

      if (inCode) {
        codeBuffer.push(line)
        continue
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList()
        const cells = line.trim().split('|').slice(1, -1).map(c => c.trim())
        if (!inTable) {
          inTable = true
          tableHeader = cells
          tableRows = []
        } else if (line.includes('---')) {
          // separator
        } else {
          tableRows.push(cells)
        }
        continue
      } else {
        flushTable()
      }

      // Lists
      const isUl = line.match(/^[-*]\s+(.*)/)
      const isOl = line.match(/^\d+\.\s+(.*)/)
      if (isUl || isOl) {
        const itemText = isUl ? isUl[1] : isOl[1]
        const curIsOl = !!isOl
        if (!inList) {
          inList = true
          listIsOl = curIsOl
          listItems = [itemText]
        } else {
          listItems.push(itemText)
        }
        continue
      } else {
        flushList()
      }

      // Headings
      if (line.startsWith('# ')) {
        parsed.push({ type: 'h1', text: line.slice(2) })
        continue
      }
      if (line.startsWith('## ')) {
        const text = line.slice(3)
        // Extract section number if present for anchors
        const secMatch = text.match(/^(\d+)\.\s*(.*)/)
        parsed.push({ type: 'h2', text, id: secMatch ? `sec-${secMatch[1]}` : undefined })
        continue
      }
      if (line.startsWith('### ')) {
        parsed.push({ type: 'h3', text: line.slice(4) })
        continue
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        parsed.push({ type: 'quote', text: line.slice(2) })
        continue
      }

      // Horizontal Rule
      if (line.trim() === '---') {
        parsed.push({ type: 'hr' })
        continue
      }

      // Paragraph
      if (line.trim().length > 0) {
        parsed.push({ type: 'p', text: line })
      }
    }
    flushList()
    flushTable()
    return parsed
  }, [markdown])

  const renderInline = (str) => {
    if (!str) return null
    // Tokenize bold, code, and links
    const parts = []
    let cursor = 0
    const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g
    let match

    while ((match = regex.exec(str)) !== null) {
      if (match.index > cursor) {
        parts.push(str.slice(cursor, match.index))
      }
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>)
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(<code key={match.index} className="doc-inline-code">{token.slice(1, -1)}</code>)
      } else if (token.startsWith('[') && token.includes('](')) {
        const titleMatch = token.match(/\[(.*?)\]\((.*?)\)/)
        if (titleMatch) {
          parts.push(
            <a key={match.index} href={titleMatch[2]} target="_blank" rel="noreferrer" className="link">
              {titleMatch[1]}
            </a>
          )
        }
      }
      cursor = regex.lastIndex
    }
    if (cursor < str.length) {
      parts.push(str.slice(cursor))
    }
    return parts
  }

  return (
    <div className="doc-content">
      {blocks.map((b, idx) => {
        if (b.type === 'h1') return <h1 key={idx} className="doc-h1">{renderInline(b.text)}</h1>
        if (b.type === 'h2') return <h2 key={idx} id={b.id} className="doc-h2">{renderInline(b.text)}</h2>
        if (b.type === 'h3') return <h3 key={idx} className="doc-h3">{renderInline(b.text)}</h3>
        if (b.type === 'p') return <p key={idx} className="doc-p">{renderInline(b.text)}</p>
        if (b.type === 'quote') return <blockquote key={idx} className="doc-quote">{renderInline(b.text)}</blockquote>
        if (b.type === 'hr') return <hr key={idx} className="doc-hr" />
        if (b.type === 'code') return <pre key={idx} className="doc-pre"><code>{b.text}</code></pre>
        if (b.type === 'ul') return <ul key={idx} className="doc-list">{b.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}</ul>
        if (b.type === 'ol') return <ol key={idx} className="doc-list doc-ol">{b.items.map((it, i) => <li key={i}>{renderInline(it)}</li>)}</ol>
        if (b.type === 'table') {
          return (
            <div key={idx} className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    {b.header.map((h, i) => <th key={i}>{renderInline(h)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => <td key={cIdx}>{renderInline(cell)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

// Table of contents, derived from the numbered "## N. Title" headings.
const SECTIONS = DOCUMENTATION_MD.split(/\r?\n/).map((l) => l.match(/^## (\d+)\.\s*(.*)/)).filter(Boolean).map((m) => ({ id: `sec-${m[1]}`, n: m[1], label: m[2] }))

function download(content, type, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([content], { type })), download: name })
  a.click(); URL.revokeObjectURL(a.href)
}

export default function Documentation() {
  usePageTitle('Documentation')
  const [active, setActive] = useState(null)
  const jump = (id) => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <div className="page doc-page">
      <PageHeader title="Documentation" description="Architecture, detection and correlation rules, the demo script and an evaluator guide.">
        <Button icon={FileText} onClick={() => download(DOCUMENTATION_MD, 'text/markdown;charset=utf-8', 'CyberSentinel_Documentation.md')}>Markdown</Button>
        <Button icon={DownloadSimple} onClick={() => download(markdownToHtml(DOCUMENTATION_MD), 'text/html;charset=utf-8', 'CyberSentinel_Documentation.html')}>HTML</Button>
        <Button icon={Printer} onClick={() => window.print()}>Print</Button>
      </PageHeader>
      <div className="split rail">
        <Panel className="doc-panel"><MarkdownViewer markdown={DOCUMENTATION_MD} /></Panel>
        <nav className="doc-toc sticky-rail" aria-label="On this page">
          <div className="section-title">On this page</div>
          <ol>{SECTIONS.map((t) => <li key={t.id}><a href={`#${t.id}`} className={active === t.id ? 'active' : ''} onClick={(e) => { e.preventDefault(); jump(t.id) }}><span className="muted">{t.n}</span>{t.label}</a></li>)}</ol>
        </nav>
      </div>
    </div>
  )
}
