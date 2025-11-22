// 等待 DOM 内容完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {

    // --- 配置 ---
    const TFL_API_URL_LINES = 'https://api.tfl.gov.uk/Line/Mode/tube/Status';
    const TFL_API_URL_DISRUPTIONS = 'https://api.tfl.gov.uk/StopPoint/Mode/tube/Disruption';
    const REFRESH_INTERVAL = 30000; // 30 秒 (毫秒)
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

    // *** 新增: 站点名称中文映射 (示例) ***
    // 键(key) 必须是来自 API 的 "commonName"
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
            
            // 使用 Set 确保 naptanId 唯一
            const disruptionSet = new Set();
            disruptions.forEach(disruption => {
                // 有些中断可能没有 naptanId，需要过滤
                if (disruption.naptanId) {
                    disruptionSet.add(disruption.naptanId);
                }
            });
            
            disruptedStationIds = Array.from(disruptionSet);
            // console.log("Disrupted stations cached:", disruptedStationIds);
        } catch (error) {
            console.error("无法获取站点中断信息:", error);
            // 即使失败，也设置为空数组，避免重复请求
            disruptedStationIds = []; 
        }
    }

    /**
     * @description 获取并渲染所有线路的 *概览* 状态
     */
    async function fetchTubeStatus() {
        if (statusContainer && statusContainer.childElementCount <= 1 && loadingMessage) {
             loadingMessage.style.display = 'block';
        }

        try {
            const response = await fetch(TFL_API_URL_LINES);
            if (!response.ok) {
                throw new Error(`Line Status API 失败: ${response.status}`);
            }
            const lines = await response.json();
            
            lines.sort((a, b) => a.name.localeCompare(b.name));

            if (!statusContainer) {
                console.error("错误: 未找到 'status-container' 元素。");
                return;
            }

            statusContainer.innerHTML = '';

            lines.forEach(line => {
                renderLine(line);
            });

            // 在渲染完线路卡片后，立即在后台获取中断信息
            // 我们不 await 它，让它在后台运行
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
        
        // 翻译线路名
        const displayName = TFL_LINE_NAMES_ZH[line.id] || line.name;
        // 翻译状态
        const zhStatus = TFL_STATUS_ZH[statusDescription] || statusDescription;

        let reasonHtml = '';
        if (status.reason) {
            // 移除了中文翻译，只清理 HTML 标签
            const cleanReason = status.reason.replace(/<[^>]*>?/gm, '');
            reasonHtml = `<p class="line-reason">${cleanReason}</p>`;
        }
        
        const card = document.createElement('div');
        card.className = 'line-card';
        // 添加点击事件监听
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

        // 切换 'expanded' 类
        const isExpanded = card.classList.toggle('expanded');
        // 检查是否已加载过数据
        const hasLoaded = detailsDiv.dataset.loaded === 'true';

        // 仅在 *展开* 且 *未加载过* 时才获取数据
        if (isExpanded && !hasLoaded) {
            try {
                // 1. 获取该线路的站点
                  // 按线路名称字母顺序排序
            lines.sort((a, b) => a.name.localeCompare(b.name));

            // 检查 statusContainer 是否存在
            if (!statusContainer) {
                console.error("错误: 未找到 'status-container' 元素。");
                return;
            }

            // 清除之前的内容 (卡片和加载/错误消息)
            statusContainer.innerHTML = '';

            // 渲染每一行
            lines.forEach(line => {
                renderLine(line);
            });

        } catch (error) {
            console.error("获取地铁状态失败:", error);
            renderError("无法获取实时状态。请检查您的网络连接并重试。");
        }
    }

    // --- 辅助函数：渲染单条线路卡片 ---
    function renderLine(line) {
        if (!statusContainer) return; // 再次检查

        // 获取主要状态
        const status = line.lineStatuses[0];
        const statusDescription = status.statusSeverityDescription;
        
        // 创建卡片元素
        const card = document.createElement('div');
        card.className = 'line-card';
        
        // 获取线路颜色，默认为灰色
        const lineColor = TFL_LINE_COLORS[line.id] || '#888';

        // 检查是否有中断原因
        let reasonHtml = '';
        if (status.reason) {
            // 清理可能存在的 HTML 标签（尽管在此 API 中不常见）
            const reasonText = status.reason.replace(/<[^>]*>?/gm, '');
            reasonHtml = `<p class="line-reason">${reasonText}</p>`;
        }

        card.innerHTML = `
            <div class="line-color-bar" style="background-color: ${lineColor};"></div>
            <div class="line-content">
                <h2>${line.name}</h2>
                <p class="line-status" data-severity="${statusDescription}">
                    ${statusDescription}
                </p>
                ${reasonHtml}
            </div>
        `;
        
        statusContainer.appendChild(card);
    }

    // --- 辅助函数：渲染错误消息 ---
    function renderError(message) {
        if (!statusContainer) return; // 检查
        statusContainer.innerHTML = ''; // 清除现有内容
        const errorDiv = document.createElement('div');
        errorDiv.className = 'status-message error';
        errorDiv.textContent = message;
        statusContainer.appendChild(errorDiv);
    }

    // --- 初始加载和自动刷新 ---
    fetchTubeStatus(); // 初始获取
    setInterval(fetchTubeStatus, REFRESH_INTERVAL); // 每 30 秒刷新一次
});

