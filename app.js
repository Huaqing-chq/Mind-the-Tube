// 注意：我们移除了 'DOMContentLoaded' 包裹。
// index.html 中的 <script defer> 属性会确保 DOM 在此脚本运行前已准备就绪。

// --- 配置 ---
const TFL_API_URL_LINES = 'https://api.tfl.gov.uk/Line/Mode/tube/Status';
const TFL_API_URL_DISRUPTIONS = 'https://api.tfl.gov.uk/StopPoint/Mode/tube/Disruption';
const REFRESH_INTERVAL = 30000; // 30 秒 (毫秒)

// --- 关键元素获取 ---
// 脚本现在直接在顶层获取元素
const statusContainer = document.getElementById('status-container');
const loadingMessage = document.getElementById('loading-message');

// 用于缓存全网的站点中断信息
let disruptedStationIds = null;

// TfL 官方颜色映射
const TFL_LINE_COLORS = {
    'bakerloo': 'var(--bakerloo)',
    'central': 'var(--central)',
    'circle': 'var(--circle)',
    'district': 'var(--district)',
    'hammersmith-city': 'var(--hammersmith-city)',
    'jubilee': 'var(--jubilee)',
    'metropolitan': 'var(--metropolitan)',
    'northern': 'var(--northern)',
    'piccadilly': 'var(--piccadilly)',
    'victoria': 'var(--victoria)',
    'waterloo-city': 'var(--waterloo-city)',
    'elizabeth-line': 'var(--elizabeth-line)',
};

// 线路名称中文映射
const TFL_LINE_NAMES_ZH = {
    'bakerloo': '贝克卢线 (Bakerloo)',
    'central': '中央线 (Central)',
    'circle': '环线 (Circle)',
    'district': '区域线 (District)',
    'hammersmith-city': '哈默史密斯及城市线 (H&C)',
    'jubilee': '银禧线 (Jubilee)',
    'metropolitan': '大都会线 (Metropolitan)',
    'northern': '北线 (Northern)',
    'piccadilly': '皮卡迪利线 (Piccadilly)',
    'victoria': '维多利亚线 (Victoria)',
    'waterloo-city': '滑铁卢及城市线 (W&C)',
    'elizabeth-line': '伊丽莎白线 (Elizabeth)'
};

// 状态描述中文映射 (固定的)
const TFL_STATUS_ZH = {
    'Good Service': '服务良好',
    'Minor Delays': '轻微延误',
    'Severe Delays': '严重延误',
    'Part Closure': '部分关闭',
    'Planned Closure': '计划关闭',
    'Suspended': '暂停服务',
    'Part Suspended': '部分暂停',
    'Service Closed': '服务关闭'
};

// 站点名称中文映射 (示例)
const TFL_STATION_NAMES_ZH = {
    "King's Cross St. Pancras Underground Station": "国王十字圣潘克拉斯站",
    "Victoria Underground Station": "维多利亚站",
    "Paddington Underground Station": "帕丁顿站",
    "Waterloo Underground Station": "滑铁卢站",
    "London Bridge Underground Station": "伦敦桥站",
    "Bank Underground Station": "银行站",
    "Holborn Underground Station": "霍本站",
    "Oxford Circus Underground Station": "牛津广场站",
    "Green Park Underground Station": "绿园站",
    "Westminster Underground Station": "威斯敏斯特站",
    "South Kensington Underground Station": "南肯辛顿站",
    "Canary Wharf Underground Station": "金丝雀码头站",
};


// --- 主要函数 ---

/**
 * @description 在后台获取全网所有中断的站点ID列表并缓存
 */
async function fetchDisruptedStations() {
    try {
        const response = await fetch(TFL_API_URL_DISRUPTIONS);
        if (!response.ok) {
            throw new Error(`Disruption API failed: ${response.status}`);
        }
        const disruptions = await response.json();
        
        const disruptionSet = new Set();
        disruptions.forEach(disruption => {
            if (disruption.naptanId) {
                disruptionSet.add(disruption.naptanId);
            }
        });
        
        disruptedStationIds = Array.from(disruptionSet);
    } catch (error) {
        console.error("无法获取站点中断信息:", error);
        disruptedStationIds = []; 
    }
}

/**
 * @description 获取并渲染所有线路的 *概览* 状态
 */
async function fetchTubeStatus() {
    // 检查元素是否在启动时被正确找到
    if (!statusContainer) {
        console.error("错误: 未找到 'status-container' 元素。请检查 index.html。");
        // 隐藏 loadingMessage (如果它被找到了的话)
        if (loadingMessage) loadingMessage.style.display = 'none';
        return;
    }

    // 原始的 if 检查是多余的，因为 loadingMessage 默认可见。
    // 我们会在 try/catch 块中处理它。

    try {
        const response = await fetch(TFL_API_URL_LINES);
        if (!response.ok) {
            throw new Error(`Line Status API 失败: ${response.status}`);
        }
        const lines = await response.json();
        
        lines.sort((a, b) => a.name.localeCompare(b.name));

        // 这是关键：清除容器，这会移除 "Loading..."
        statusContainer.innerHTML = '';

        lines.forEach(line => {
            renderLine(line);
        });

        if (disruptedStationIds === null) {
            fetchDisruptedStations();
        }

    } catch (error) {
        console.error("获取地铁状态失败:", error);
        renderError("无法获取实时状态。请检查您的网络连接并重试。");
    }
}

/**
 * @description 渲染单条线路卡片 (概览)
 */
function renderLine(line) {
    if (!statusContainer) return;

    const status = line.lineStatuses[0];
    const statusDescription = status.statusSeverityDescription;
    const lineColor = TFL_LINE_COLORS[line.id] || '#888';
    
    const displayName = TFL_LINE_NAMES_ZH[line.id] || line.name;
    const zhStatus = TFL_STATUS_ZH[statusDescription] || statusDescription;

    let reasonHtml = '';
    if (status.reason) {
        const cleanReason = status.reason.replace(/<[^>]*>?/gm, '');
        reasonHtml = `<p class="line-reason">${cleanReason}</p>`;
    }
    
    const card = document.createElement('div');
    card.className = 'line-card';
    card.addEventListener('click', () => toggleLineDetails(line.id));
    
    card.innerHTML = `
        <div class="line-color-bar" style="background-color: ${lineColor};"></div>
        <div class="line-content">
            <h2>${displayName}</h2> 
            <p class="line-status" data-severity="${statusDescription}">
                ${zhStatus}
            </p>
            ${reasonHtml}
        </div>
        <!-- 详细信息的容器 (默认隐藏) -->
        <div class="line-details" id="details-${line.id}">
            <p class="loading-stations">正在加载站点列表...</p>
        </div>
    `;
    
    statusContainer.appendChild(card);
}

/**
 * @description 处理卡片点击事件
 */
async function toggleLineDetails(lineId) {
    const detailsDiv = document.getElementById(`details-${lineId}`);
    const card = detailsDiv.closest('.line-card');
    if (!detailsDiv || !card) return;

    const isExpanded = card.classList.toggle('expanded');
    const hasLoaded = detailsDiv.dataset.loaded === 'true';

    if (isExpanded && !hasLoaded) {
        try {
            const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/StopPoints`);
            if (!response.ok) {
                throw new Error(`StopPoints API failed: ${response.status}`);
            }
            const stations = await response.json();
            
            detailsDiv.dataset.loaded = 'true';

            if (disruptedStationIds === null) {
                await fetchDisruptedStations();
            }

            renderStationList(stations, detailsDiv);

        } catch (error) {
            console.error("无法加载站点列表:", error);
            detailsDiv.innerHTML = `<p class="error-stations">无法加载站点列表。</p>`;
        }
    }
}

/**
 * @description 渲染站点列表
 */
function renderStationList(stations, detailsDiv) {
    detailsDiv.innerHTML = ''; 

    if (!stations || stations.length === 0) {
        detailsDiv.innerHTML = `<p class="error-stations">未找到该线路的站点。</p>`;
        return;
    }

    const list = document.createElement('ul');
    list.className = 'station-list';

    const validStations = stations.filt
