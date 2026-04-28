import { db } from './firebase-config.js';
import { collection, query, orderBy, where, startAfter, startAt, limit, getDocs } from "firebase/firestore";

// Tailwind Configuration (if needed for dynamic classes, though usually handled by build)
// Since we are moving to a build step, tailwind config should be in tailwind.config.js
// But for runtime dynamic classes, we might keep some logic if necessary.
// For now, we assume standard Tailwind classes.

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DE LA APLICACIÓN ---
    const PAGE_SIZE = 15;
    let lastVisible = null;
    let firstVisible = null;
    let currentPage = 1;
    let pageSnapshots = { 1: null };
    let isShowingAll = false;

    // --- ELEMENTOS DEL DOM ---
    const resultsBodyTable = document.getElementById('resultsBodyTable');
    const resultsBodyCards = document.getElementById('resultsBodyCards');
    const riskFilter = document.getElementById('riskFilter');
    const searchInput = document.getElementById('searchInput');
    const copyToast = document.getElementById('copyToast');

    // Selectores para multiples controles de paginación
    const paginationControls = document.querySelectorAll('.pagination-controls');
    const prevButtons = document.querySelectorAll('.prev-button');
    const nextButtons = document.querySelectorAll('.next-button');
    const pageIndicators = document.querySelectorAll('.page-indicator');
    const showAllButtons = document.querySelectorAll('.show-all-button');
    const showPaginatedButtons = document.querySelectorAll('.show-paginated-button');

    // --- LÓGICA DE DATOS (FIRESTORE) ---

    async function loadData(direction = 'first') {
        if (isShowingAll) {
            isShowingAll = false;
        }
        showLoading();

        try {
            let q;
            const risk = riskFilter.value;

            if (risk) {
                // Cuando se filtra, evitamos orderBy('Fabricante') para no requerir un índice compuesto
                // Si el usuario crea el índice, podríamos volver a agregarlo.
                q = query(collection(db, 'creds_vulnerables'), where('Nivel_Riesgo_CVSS', '==', risk.toUpperCase()));
            } else {
                q = query(collection(db, 'creds_vulnerables'), orderBy('Fabricante', 'asc'));
            }

            switch (direction) {
                case 'next':
                    if (lastVisible) {
                        q = query(q, startAfter(lastVisible), limit(PAGE_SIZE));
                    }
                    currentPage++;
                    break;
                case 'prev':
                    const prevSnapshot = pageSnapshots[currentPage - 1] || null;
                    if (prevSnapshot) {
                        q = query(q, startAt(prevSnapshot), limit(PAGE_SIZE));
                    } else {
                        // Fallback to first page if no snapshot
                        q = query(q, limit(PAGE_SIZE));
                        currentPage = 1;
                    }
                    currentPage--;
                    break;
                case 'first':
                default:
                    currentPage = 1;
                    pageSnapshots = { 1: null };
                    q = query(q, limit(PAGE_SIZE));
                    break;
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (snapshot.docs.length > 0) {
                firstVisible = snapshot.docs[0];
                lastVisible = snapshot.docs[snapshot.docs.length - 1];
                if (direction === 'next') {
                    pageSnapshots[currentPage] = firstVisible;
                }
            }

            const search = searchInput.value.trim().toLowerCase();
            const filteredData = !search ? data : data.filter(row =>
                [row.Fabricante, row.Modelo, row.Tipo_Servicio].some(f => (f || '').toLowerCase().includes(search))
            );

            renderResults(filteredData);
            updatePaginationControls(snapshot.docs.length);

        } catch (err) {
            showError(err);
        }
    }

    async function loadAllData() {
        const confirmation = confirm("Advertencia: Cargar todos los resultados puede afectar el rendimiento en bases de datos muy grandes. ¿Deseas continuar?");
        if (!confirmation) {
            return;
        }

        isShowingAll = true;
        showLoading();

        try {
            let q;
            const risk = riskFilter.value;

            if (risk) {
                q = query(collection(db, 'creds_vulnerables'), where('Nivel_Riesgo_CVSS', '==', risk.toUpperCase()));
            } else {
                q = query(collection(db, 'creds_vulnerables'), orderBy('Fabricante', 'asc'));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const search = searchInput.value.trim().toLowerCase();
            const filteredData = !search ? data : data.filter(row =>
                [row.Fabricante, row.Modelo, row.Tipo_Servicio].some(f => (f || '').toLowerCase().includes(search))
            );

            renderResults(filteredData);
            updatePaginationControls(filteredData.length, true);

        } catch (err) {
            showError(err);
        }
    }

    // --- LÓGICA DE RENDERIZADO ---

    function renderResults(data) {
        if (!data.length) {
            showNoResults();
            return;
        }

        // Función para sanitizar HTML y prevenir XSS
        const sanitize = (str) => {
            if (!str) return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        };

        resultsBodyTable.innerHTML = data.map((row, index) => `
            <tr class="group hover:bg-white/5 transition-colors duration-200 border-b border-white/5 last:border-0">
                <td class="px-6 py-4 font-medium text-white">${sanitize(row.Fabricante)}</td>
                <td class="px-6 py-4 text-gray-300">${sanitize(row.Modelo)}</td>
                <td class="px-6 py-4 text-gray-300">${sanitize(row.Tipo_Servicio)}</td>
                <td class="px-6 py-4 text-gray-400 font-mono text-xs">${sanitize(row.Puerto_Default)}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${riskBadge(row.Nivel_Riesgo_CVSS)}">
                        ${sanitize(row.Nivel_Riesgo_CVSS)}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="toggle-detail-button text-sm font-medium text-primary hover:text-accent transition-colors focus:outline-none" data-target-id="table-${row.id}">
                        Ver Detalle
                    </button>
                </td>
            </tr>
            <tr id="detail-table-${row.id}" class="hidden bg-dark-800/50 shadow-inner">
                <td colspan="6" class="p-0">
                    <div class="p-6 grid md:grid-cols-2 gap-8 animate-fade-in">
                        <div class="space-y-4">
                            <div class="bg-dark-900/50 p-4 rounded-xl border border-white/5">
                                <label class="text-xs text-secondary uppercase tracking-wider font-semibold block mb-2">Credenciales</label>
                                <div class="flex items-center justify-between mb-2 group/copy">
                                    <span class="text-gray-400 text-sm">Usuario:</span>
                                    <div class="flex items-center gap-2">
                                        <code class="text-white font-mono bg-white/5 px-2 py-1 rounded select-all">${sanitize(row.Credencial_Usuario)}</code>
                                        <button class="copy-button text-secondary hover:text-white opacity-0 group-hover/copy:opacity-100 transition-opacity" data-copy-text="${sanitize(row.Credencial_Usuario)}" title="Copiar Usuario">
                                            <span class="material-symbols-outlined text-sm">content_copy</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between group/copy">
                                    <span class="text-gray-400 text-sm">Password:</span>
                                    <div class="flex items-center gap-2">
                                        <code class="text-white font-mono bg-white/5 px-2 py-1 rounded select-all">${sanitize(row.Credencial_Password)}</code>
                                        <button class="copy-button text-secondary hover:text-white opacity-0 group-hover/copy:opacity-100 transition-opacity" data-copy-text="${sanitize(row.Credencial_Password)}" title="Copiar Password">
                                            <span class="material-symbols-outlined text-sm">content_copy</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                             <label class="text-xs text-secondary uppercase tracking-wider font-semibold block">Guía de Remediación</label>
                             <p class="text-sm text-gray-300 leading-relaxed whitespace-pre-line">${sanitize(row.Guia_Remediacion)}</p>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        resultsBodyCards.innerHTML = data.map(row => `
            <div class="glass-card rounded-2xl p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-lg text-white">${sanitize(row.Fabricante)}</h3>
                        <p class="text-sm text-secondary">${sanitize(row.Modelo)}</p>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${riskBadge(row.Nivel_Riesgo_CVSS)}">
                        ${sanitize(row.Nivel_Riesgo_CVSS)}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                        <span class="block text-xs text-secondary">Servicio</span>
                        <span class="text-gray-300">${sanitize(row.Tipo_Servicio)}</span>
                    </div>
                    <div>
                        <span class="block text-xs text-secondary">Puerto</span>
                        <span class="text-gray-300 font-mono">${sanitize(row.Puerto_Default)}</span>
                    </div>
                </div>
                <button class="toggle-detail-button w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors border border-white/5" data-target-id="card-${row.id}">
                    Ver Detalles
                </button>
                
                <div id="detail-card-${row.id}" class="hidden mt-4 pt-4 border-t border-white/10 space-y-4 animate-fade-in">
                    <div class="bg-dark-900/50 p-4 rounded-xl border border-white/5">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs text-secondary">Usuario</span>
                            <div class="flex items-center gap-2">
                                <code class="text-white font-mono text-sm">${sanitize(row.Credencial_Usuario)}</code>
                                <button class="copy-button text-secondary hover:text-white" data-copy-text="${sanitize(row.Credencial_Usuario)}">
                                    <span class="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-secondary">Password</span>
                            <div class="flex items-center gap-2">
                                <code class="text-white font-mono text-sm">${sanitize(row.Credencial_Password)}</code>
                                <button class="copy-button text-secondary hover:text-white" data-copy-text="${sanitize(row.Credencial_Password)}">
                                    <span class="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span class="block text-xs text-secondary mb-1">Remediación</span>
                        <p class="text-xs text-gray-400 leading-relaxed">${sanitize(row.Guia_Remediacion)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function riskBadge(risk) {
        switch ((risk || '').toLowerCase()) {
            case 'crítico': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'alto': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'medio': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    }

    function showLoading() {
        paginationControls.forEach(c => c.classList.add('hidden'));
        resultsBodyTable.innerHTML = `<tr><td colspan='6' class='text-center py-12 text-secondary animate-pulse'>Cargando datos de inteligencia...</td></tr>`;
        resultsBodyCards.innerHTML = `<div class='text-center py-12 text-secondary animate-pulse'>Cargando datos...</div>`;
    }

    function showNoResults() {
        paginationControls.forEach(c => c.classList.add('hidden'));
        resultsBodyTable.innerHTML = `<tr><td colspan='6' class='text-center py-12 text-secondary'>No se encontraron credenciales que coincidan.</td></tr>`;
        resultsBodyCards.innerHTML = `<div class='text-center py-12 text-secondary'>No se encontraron resultados.</div>`;
    }

    function showError(err) {
        paginationControls.forEach(c => c.classList.add('hidden'));
        const errorHTML = `<tr><td colspan='6' class='text-center py-12 text-red-400'>Error de conexión con la base de datos.<br><span class="text-xs text-red-500/70">${err.message}</span></td></tr>`;
        resultsBodyTable.innerHTML = errorHTML;
        resultsBodyCards.innerHTML = errorHTML.replace(/<\/tr>/g, '</div>').replace(/<tr.+?>/g, '<div>');
    }

    // --- LÓGICA DE PAGINACIÓN Y UI ---

    function updatePaginationControls(dataLength, isAll = false) {
        paginationControls.forEach(c => {
            c.classList.remove('hidden');
            c.style.display = 'flex';
        });

        if (isAll) {
            pageIndicators.forEach(pi => pi.textContent = `Mostrando ${dataLength} resultados`);
            prevButtons.forEach(b => b.classList.add('hidden'));
            nextButtons.forEach(b => b.classList.add('hidden'));
            showAllButtons.forEach(b => b.classList.add('hidden'));
            showPaginatedButtons.forEach(b => b.classList.remove('hidden'));
        } else {
            pageIndicators.forEach(pi => pi.textContent = `Página ${currentPage}`);
            prevButtons.forEach(b => { b.classList.remove('hidden'); b.disabled = currentPage === 1; });
            nextButtons.forEach(b => { b.classList.remove('hidden'); b.disabled = dataLength < PAGE_SIZE; });
            showAllButtons.forEach(b => b.classList.remove('hidden'));
            showPaginatedButtons.forEach(b => b.classList.add('hidden'));
        }
    }

    function toggleDetail(targetId) {
        document.getElementById(`detail-${targetId}`)?.classList.toggle('hidden');
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => showCopyToast());
    }

    function showCopyToast() {
        copyToast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => copyToast.classList.add('translate-y-20', 'opacity-0'), 2000);
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- EVENTOS ---

    riskFilter.addEventListener('change', () => loadData('first'));
    searchInput.addEventListener('input', debounce(() => loadData('first'), 300));

    prevButtons.forEach(button => button.addEventListener('click', () => loadData('prev')));
    nextButtons.forEach(button => button.addEventListener('click', () => loadData('next')));
    showAllButtons.forEach(button => button.addEventListener('click', loadAllData));
    showPaginatedButtons.forEach(button => button.addEventListener('click', () => loadData('first')));

    // Delegación de eventos para los botones de detalle y copiar
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('toggle-detail-button')) {
            const targetId = target.dataset.targetId;
            if (targetId) {
                toggleDetail(targetId);
            }
        }
        if (target.classList.contains('copy-button')) {
            const textToCopy = target.dataset.copyText;
            if (textToCopy) {
                copyToClipboard(textToCopy);
            }
        }
    });

    // --- INICIALIZACIÓN ---

    function initialize() {
        loadData('first');
    }

    initialize();
});
