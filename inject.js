(function() {
    'use strict';
    function processTemplate(html) {
        return html.replace(/\$\{([^}]+)\}/g, function(match, expression) {
            try {
                return Function('return (' + expression + ')')();
            } catch (e) {
                console.warn('Template expression error:', expression, e);
                return match;
            }
        });
    }
    
    function loadContent(src) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', src, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('Failed to load: ' + src + ' (Status: ' + xhr.status + ')'));
                    }
                }
            };
            xhr.onerror = function() {
                reject(new Error('Network error loading: ' + src));
            };
            xhr.send();
        });
    }
    
    function executeScript(content) {
        try {
            content = content.trim();
            if (content) {
                if (content.includes('{') && content.includes('}') && content.includes(':') && 
                    !content.includes('function') && !content.includes('var') && 
                    !content.includes('let') && !content.includes('const') && 
                    !content.includes('=') && !content.includes('console')) {
                    console.warn('Skipping potential CSS content in script execution:', content.substring(0, 100));
                    return;
                }
                Function(content)();
            }
        } catch (e) {
            console.error('Error executing script:', e);
            console.error('Script content that failed:', content.substring(0, 200));
        }
    }
    
    function addExternalScript(src, attributes) {
        var script = document.createElement('script');
        script.src = src;
        if (attributes) {
            Object.keys(attributes).forEach(function(key) {
                script.setAttribute(key, attributes[key]);
            });
        }
        document.head.appendChild(script);
    }
    
    function addCSS(content) {
        var style = document.createElement('style');
        style.textContent = content;
        document.head.appendChild(style);
    }
    
    function processComponentContent(content, element) {
        content = content.trim();
        if (content.startsWith('<head>') && content.endsWith('</head>')) {
            var headContent = content.slice(6, -7);
            var temp = document.createElement('div');
            temp.innerHTML = headContent;
            while (temp.firstChild) {
                var child = temp.firstChild;
                temp.removeChild(child);
                if (child.nodeType === 1) {
                    if (child.tagName.toLowerCase() === 'script') {
                        if (child.src) {
                            addExternalScript(child.src, getElementAttributes(child));
                        } else {
                            var scriptType = child.type || 'text/javascript';
                            if (scriptType === 'text/javascript' || scriptType === 'application/javascript' || scriptType === '') {
                                executeScript(child.textContent);
                            } else {
                                var newScript = document.createElement('script');
                                newScript.type = scriptType;
                                newScript.textContent = child.textContent;
                                var attrs = getElementAttributes(child);
                                if (attrs) {
                                    Object.keys(attrs).forEach(function(key) {
                                        newScript.setAttribute(key, attrs[key]);
                                    });
                                }
                                document.head.appendChild(newScript);
                            }
                        }
                    } else {
                        document.head.appendChild(child);
                    }
                }
            }
            element.parentNode.removeChild(element);
        } else if (content.startsWith('<script>') && content.endsWith('</script>')) {
            var scriptContent = content.slice(8, -9);
            executeScript(scriptContent);
            element.parentNode.removeChild(element);
        } else if (content.startsWith('<css>') && content.endsWith('</css>')) {
            var cssContent = content.slice(5, -6);
            addCSS(cssContent);
            element.parentNode.removeChild(element);
        } else {
            var temp = document.createElement('div');
            temp.innerHTML = content;
            var fragment = document.createDocumentFragment();
            while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
            }
            element.parentNode.replaceChild(fragment, element);
        }
    }
    
    function getElementAttributes(element) {
        var attrs = {};
        Array.prototype.forEach.call(element.attributes, function(attr) {
            if (attr.name !== 'src') {
                attrs[attr.name] = attr.value;
            }
        });
        return Object.keys(attrs).length > 0 ? attrs : null;
    }
    
    function processInjectElement(element) {
        var src = element.getAttribute('src');
        if (!src) {
            console.warn('in-ject element missing src attribute');
            return Promise.resolve();
        }
        
        return loadContent(src)
            .then(function(content) {
                var processedContent = processTemplate(content);
                processComponentContent(processedContent, element);
            })
            .catch(function(error) {
                console.error('Error loading component:', error);
                element.innerHTML = '<!-- Error loading: ' + src + ' -->';
            });
    }
    
    function processAllInjects() {
        var injectElements = document.querySelectorAll('in-ject');
        var promises = [];
        Array.prototype.forEach.call(injectElements, function(element) {
            promises.push(processInjectElement(element));
        });
        return Promise.all(promises);
    }
    
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', processAllInjects);
        } else {
            processAllInjects();
        }
    }
    
    init();
    
    window.InjectFramework = {
        process: processAllInjects,
        processElement: processInjectElement,
        loadContent: loadContent
    };
})();