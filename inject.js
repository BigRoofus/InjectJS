(function() {
    'use strict';
    
    // Simple template engine for basic variable substitution
    function processTemplate(html) {
        // Replace ${expression} with evaluated JavaScript
        return html.replace(/\$\{([^}]+)\}/g, function(match, expression) {
            try {
                return Function('return (' + expression + ')')();
            } catch (e) {
                console.warn('Template expression error:', expression, e);
                return match;
            }
        });
    }
    
    // Load content via XMLHttpRequest
    function loadContent(src) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', src, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
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
    
    // Execute JavaScript content
    function executeScript(content) {
        try {
            content = content.trim();
            if (content) {
                // Basic validation to avoid executing CSS or other content
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
    
    // Add external script to head
    function addExternalScript(src, attributes) {
        var script = document.createElement('script');
        script.src = src;
        
        // Add any additional attributes
        if (attributes) {
            Object.keys(attributes).forEach(function(key) {
                script.setAttribute(key, attributes[key]);
            });
        }
        
        document.head.appendChild(script);
    }
    
    // Add CSS to head
    function addCSS(content) {
        var style = document.createElement('style');
        style.textContent = content;
        document.head.appendChild(style);
    }
    
    // Process component content based on wrapper tags
    function processComponentContent(content, element) {
        content = content.trim();
        
        // Check if content is wrapped in specific tags
        if (content.startsWith('<head>') && content.endsWith('</head>')) {
            // Extract head content and add to document head
            var headContent = content.slice(6, -7); // Remove <head> and </head>
            var temp = document.createElement('div');
            temp.innerHTML = headContent;
            
            // Move all children to document head
            while (temp.firstChild) {
                var child = temp.firstChild;
                temp.removeChild(child);
                
                if (child.nodeType === 1) { // Element node
                    if (child.tagName.toLowerCase() === 'script') {
                        if (child.src) {
                            // External script
                            addExternalScript(child.src, getElementAttributes(child));
                        } else {
                            // Inline script - check type before executing
                            var scriptType = child.type || 'text/javascript';
                            if (scriptType === 'text/javascript' || scriptType === 'application/javascript' || scriptType === '') {
                                // Regular JavaScript - execute it
                                executeScript(child.textContent);
                            } else {
                                // Non-JavaScript script (like JSON-LD) - add to head as-is
                                var newScript = document.createElement('script');
                                newScript.type = scriptType;
                                newScript.textContent = child.textContent;
                                
                                // Copy other attributes
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
            
            // Remove the inject element since content went to head
            element.parentNode.removeChild(element);
            
        } else if (content.startsWith('<script>') && content.endsWith('</script>')) {
            // Extract and execute script content
            var scriptContent = content.slice(8, -9); // Remove <script> and </script>
            executeScript(scriptContent);
            
            // Remove the inject element
            element.parentNode.removeChild(element);
            
        } else if (content.startsWith('<css>') && content.endsWith('</css>')) {
            // Extract CSS content and add to head
            var cssContent = content.slice(5, -6); // Remove <css> and </css>
            addCSS(cssContent);
            
            // Remove the inject element
            element.parentNode.removeChild(element);
            
        } else {
            // Plain HTML - replace the inject element with content
            var temp = document.createElement('div');
            temp.innerHTML = content;
            
            var fragment = document.createDocumentFragment();
            while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
            }
            
            element.parentNode.replaceChild(fragment, element);
        }
    }
    
    // Get all attributes from an element as an object
    function getElementAttributes(element) {
        var attrs = {};
        Array.prototype.forEach.call(element.attributes, function(attr) {
            if (attr.name !== 'src') {
                attrs[attr.name] = attr.value;
            }
        });
        return Object.keys(attrs).length > 0 ? attrs : null;
    }
    
    // Process a single inject element
    function processInjectElement(element) {
        var src = element.getAttribute('src');
        if (!src) {
            console.warn('in-ject element missing src attribute');
            return Promise.resolve();
        }
        
        return loadContent(src)
            .then(function(content) {
                // Process any template expressions
                var processedContent = processTemplate(content);
                
                // Process based on wrapper tags
                processComponentContent(processedContent, element);
            })
            .catch(function(error) {
                console.error('Error loading component:', error);
                // Replace with error message in development
                element.innerHTML = '<!-- Error loading: ' + src + ' -->';
            });
    }
    
    // Process all in-ject elements
    function processAllInjects() {
        var injectElements = document.querySelectorAll('in-ject');
        var promises = [];
        
        // Convert NodeList to Array and process each element
        Array.prototype.forEach.call(injectElements, function(element) {
            promises.push(processInjectElement(element));
        });
        
        return Promise.all(promises);
    }
    
    // Initialize when DOM is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', processAllInjects);
        } else {
            // DOM already loaded
            processAllInjects();
        }
    }
    
    // Auto-initialize
    init();
    
    // Expose API for manual processing if needed
    window.InjectFramework = {
        process: processAllInjects,
        processElement: processInjectElement,
        loadContent: loadContent
    };
    
})();