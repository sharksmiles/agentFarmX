declare global {
    interface Window {
        dataLayer: any[]
        gtag?: (...args: any[]) => void
    }
}

export const init_analysis = () => {
    const addInlineScript = (content: string) => {
        const script = document.createElement("script")
        script.textContent = content
        document.head.appendChild(script)
    }
    const addScript = (src: string, async: boolean = true, defer: boolean = false) => {
        const script = document.createElement("script")
        script.src = src
        script.async = async
        script.defer = defer
        document.head.appendChild(script)
        return script
    }
    addInlineScript(`
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "n2gtxbh9yh");
    `)
    addScript("https://www.googletagmanager.com/gtag/js?id=G-337QEYKCML")
    window.dataLayer = window.dataLayer || []
    window.gtag =
        window.gtag ||
        function () {
            window.dataLayer.push(arguments)
        }
    addInlineScript(`
    gtag('js', new Date());
    gtag('config', 'G-337QEYKCML');
    `)
}
