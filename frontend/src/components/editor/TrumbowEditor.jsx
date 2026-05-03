import { useEffect, useRef, useCallback } from 'react'

function TrumbowEditor({ value, onChange }) {
    const ref = useRef(null)
    const editorRef = useRef(null)
    const isInitializedRef = useRef(false)

    useEffect(() => {
        // check an toàn
        if (!window.$ || !window.$.fn.trumbowyg) {
            console.error('Trumbowyg NOT loaded correctly')
            return
        }

        const $editor = window.$(ref.current)
        $editor.trumbowyg()
        editorRef.current = $editor

        // Set initial value only once
        if (value && !isInitializedRef.current) {
            $editor.trumbowyg('html', value)
            isInitializedRef.current = true
        }

        return () => {
            $editor.trumbowyg('destroy')
        }
    }, [])

    // Handle onChange event with useCallback to prevent reattachment
    const handleChange = useCallback(() => {
        if (editorRef.current && onChange) {
            const html = editorRef.current.trumbowyg('html')
            onChange(html)
        }
    }, [onChange])

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.on('tbwchange', handleChange)
            return () => {
                editorRef.current?.off('tbwchange', handleChange)
            }
        }
    }, [handleChange])

    return <div ref={ref} />
}

export default TrumbowEditor
