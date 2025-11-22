// 等待 DOM 内容完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {

    // --- 配置 ---
    const TFL_API_URL = 'https://api.tfl.gov.uk/Line/Mode/tube/Status';
    const REFRESH_INTERVAL = 30000; // 30 秒 (毫秒)
    const statusContainer = document.getElementById('status-container');
    const loadingMessage = document.getElementById('loading-message');

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
        'london-overground': 'var(--overground)',
        'dlr': 'var(--dlr)',
        'tfl-rail': 'var(--elizabeth-line)', // TfL Rail 现在是 Elizabeth Line
        'tram': 'var(--tram)'
    };

    // --- 获取并渲染状态的主函数 ---
    async function fetchTubeStatus() {
        
        // 仅在初始加载时显示“加载中”消息，后续刷新不显示
        if (statusContainer && statusContainer.childElementCount <= 1 && loadingMessage) {
             loadingMessage.style.display = 'block';
        }

        try {
            const response = await fetch(TFL_API_URL);
            if (!response.ok) {
                throw new Error(`TfL API 请求失败: ${response.status}`);
            }
            const lines = await response.json();
            
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
