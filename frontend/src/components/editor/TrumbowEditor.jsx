import { useEffect, useRef, useCallback } from 'react'
import './Trumbow.scss'

function TrumbowEditor({ value, onChange, minHeight = '160px' }) {
    const wrapperRef = useRef(null)
    const textareaRef = useRef(null)
    const editorRef = useRef(null)
    const isSelfChanging = useRef(false)

    useEffect(() => {
        if (!window.$ || !window.$.fn.trumbowyg) {
            console.error('Trumbowyg NOT loaded correctly')
            return
        }

        // Create a detached textarea so Trumbowyg owns it, not React
        const textarea = document.createElement('textarea')
        wrapperRef.current.appendChild(textarea)
        textareaRef.current = textarea

        const $editor = window.$(textarea)
        $editor.trumbowyg({ resetCss: true })
        editorRef.current = $editor

        if (value) {
            $editor.trumbowyg('html', value)
        }

        wrapperRef.current.style.setProperty('--trumbow-min-height', minHeight)

        // Trumbowyg appends its modal/overlay to document.body by default.
        // When TrumbowEditor is used inside a Radix Dialog, Radix marks the rest
        // of the body as `inert`, so those elements can't receive input.
        // Fix: intercept additions and move them inside wrapperRef (which lives
        // inside the Dialog portal and is therefore not inert).
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue
                    const el = /** @type {HTMLElement} */ (node)
                    if (
                        el.classList.contains('trumbowyg-modal') ||
                        el.classList.contains('trumbowyg-overlay')
                    ) {
                        wrapperRef.current?.appendChild(el)
                    }
                }
            }
        })
        observer.observe(document.body, { childList: true })

        return () => {
            observer.disconnect()
            try {
                $editor.trumbowyg('destroy')
            } catch (_) { }
            try {
                if (wrapperRef.current && textarea.parentNode === wrapperRef.current) {
                    wrapperRef.current.removeChild(textarea)
                }
            } catch (_) { }
            editorRef.current = null
            textareaRef.current = null
        }
    }, [])

    // Sync external value changes (e.g. pre-fill from alias select)
    useEffect(() => {
        if (!editorRef.current) return
        const current = editorRef.current.trumbowyg('html')
        if (current !== value) {
            isSelfChanging.current = true
            editorRef.current.trumbowyg('html', value ?? '')
            isSelfChanging.current = false
        }
    }, [value])

    const handleChange = useCallback(() => {
        if (isSelfChanging.current) return
        if (editorRef.current && onChange) {
            const html = editorRef.current.trumbowyg('html')
            onChange(html)
        }
    }, [onChange])

    useEffect(() => {
        if (!editorRef.current) return
        editorRef.current.on('tbwchange', handleChange)
        return () => {
            editorRef.current?.off('tbwchange', handleChange)
        }
    }, [handleChange])

    return <div ref={wrapperRef} className="trumbow-editor-wrapper" />
}

export default TrumbowEditor
