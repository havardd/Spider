document.getElementById('download-multiple-btn').addEventListener('click', async () => {
    const linksInput = document.getElementById('links').value;
    const statusElement = document.getElementById('status');

    if (!linksInput.trim()) {
        statusElement.textContent = 'Vennligst lim inn minst én gyldig lenke.';
        return;
    }

    const links = linksInput.split('\n').map(link => link.trim()).filter(link => link);
    if (links.length === 0) {
        statusElement.textContent = 'Ingen gyldige lenker funnet.';
        return;
    }

    statusElement.textContent = 'Laster ned nettsider...';

    for (const link of links) {
        try {
            // Hent HTML-innholdet fra lenken
            const response = await fetch(link);
            if (!response.ok) {
                throw new Error(`Kunne ikke hente innhold fra ${link}. Statuskode: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Hent body-innholdet
            const bodyContent = doc.body.innerHTML;

            // Hent og inline CSS
            const styles = [
                // Hent eksterne CSS-filer
                ...Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(async (linkTag) => {
                    const cssHref = linkTag.href;
                    try {
                        const cssResponse = await fetch(cssHref, { mode: 'no-cors' });
                        if (cssResponse.ok) {
                            const cssText = await cssResponse.text();
                            return `<style>${cssText}</style>`;
                        } else {
                            console.warn(`Kunne ikke hente CSS fra ${cssHref}. Statuskode: ${cssResponse.status}`);
                        }
                    } catch (error) {
                        console.warn(`Feil ved henting av CSS fra ${cssHref}:`, error);
                    }
                    return ''; // Returner en tom streng hvis CSS-henting feiler
                }),
                // Hent interne CSS-stiler
                ...Array.from(doc.querySelectorAll('style')).map((styleTag) => {
                    return `<style>${styleTag.innerHTML}</style>`;
                })
            ];

            const scripts = Array.from(doc.querySelectorAll('script[src]')).map(async (scriptTag) => {
                const jsSrc = scriptTag.src;
                try {
                    const jsResponse = await fetch(jsSrc, { mode: 'no-cors' });
                    if (jsResponse.ok) {
                        const jsText = await jsResponse.text();
                        return `<script>${jsText}</script>`;
                    } else {
                        console.warn(`Kunne ikke hente JavaScript fra ${jsSrc}. Statuskode: ${jsResponse.status}`);
                    }
                } catch (error) {
                    console.warn(`Feil ved henting av JavaScript fra ${jsSrc}:`, error);
                }
                return ''; // Returner en tom streng hvis JS-henting feiler
            });

            const inlineStyles = (await Promise.all(styles)).join('\n');
            const inlineScripts = (await Promise.all(scripts)).join('\n');

            // Legg til en melding for manglende ressurser
            if (!inlineStyles) {
                console.warn('Noen CSS-ressurser kunne ikke inkluderes på grunn av CORS-begrensninger eller 404-feil.');
            }
            if (!inlineScripts) {
                console.warn('Noen JavaScript-ressurser kunne ikke inkluderes på grunn av CORS-begrensninger eller 404-feil.');
            }

            // Legg til CSS for å begrense bildestørrelse
            const additionalStyles = `
                <style>
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    svg {
                        max-width: 100%; /* Begrens SVG-er til containerens bredde */
                        height: auto;
                        display: block;
                    }
                    svg polygon {
                        max-width: 100%; /* Begrens polygon-elementer */
                        height: auto;
                    }
                    svg[data-icon] {
                        width: 1em; /* Sett SVG-ikoner til en proporsjonal størrelse */
                        height: 1em;
                    }
                    /* Spesifikk regel for SVG-er med klasser som påvirker layout */
                    svg.c_icon {
                        width: 50%; /* Sett en spesifikk bredde for SVG-er med klassen 'c_icon' */
                        height: auto;
                    }
                </style>
            `;

            // Sett sammen en komplett HTML-fil med inline-stiler og dynamisk innhold
            const completeHtml = `
                <!DOCTYPE html>
                <html lang="no">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${doc.title}</title>
                    ${inlineStyles}
                    ${additionalStyles}
                </head>
                <body>
                    ${bodyContent}
                    ${inlineScripts}
                </body>
                </html>
            `;

            // Opprett en nedlastbar fil
            const blob = new Blob([completeHtml], { type: 'text/html' });
            const linkElement = document.createElement('a');
            linkElement.href = URL.createObjectURL(blob);

            // Bruk tittelen på nettsiden som filnavn
            const sanitizedFilename = doc.title.replace(/[^a-å0-9]/gi, ' ').toLowerCase() + '.html';
            linkElement.download = sanitizedFilename;
            linkElement.click();
        } catch (error) {
            console.error(`Feil ved nedlasting av ${link}:`, error);
            statusElement.textContent = `Feil ved nedlasting av ${link}: ${error.message}`;
        }
    }

    statusElement.textContent = 'Nedlasting fullført! Sidene er lagret som HTML-filer.';
});
