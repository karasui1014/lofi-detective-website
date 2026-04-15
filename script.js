document.addEventListener('DOMContentLoaded', () => {
    // Custom Cursor
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Parallax Effect
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        const targets = document.querySelectorAll('.parallax-target');
        targets.forEach(target => {
            target.style.transform = `perspective(1000px) rotateY(${moveX}deg) rotateX(${-moveY}deg)`;
        });
    });

    // Intersection Observer for Animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.content-section').forEach(section => {
        observer.observe(section);
    });

    // Intro Screen Logic
    const introScreen = document.getElementById('intro-screen');
    const progress = document.querySelector('.loading-progress');
    
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                introScreen.style.opacity = '0';
                setTimeout(() => {
                    introScreen.style.display = 'none';
                }, 500);
            }, 500);
        } else {
            width += Math.random() * 15;
            if (width > 100) width = 100;
            progress.style.width = width + '%';
        }
    }, 150);

    // Initial check for hash scrolling
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }, 1000);
    }
    // === 秘密の閲覧カウンター（管理者専用の隠しコマンド） ===
    // サイトの月間閲覧数を裏側でカウントし、ロゴを5回連続クリックしたときだけ画面に表示します。
    (function initSecretCounter() {
        // 1. 今月のキーを作成
        const date = new Date();
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const counterKey = `lofi-${yearMonth}`;
        const namespace = 'karasui1014';
        
        let currentViews = 0;
        const apiBase = `https://api.counterapi.dev/v1/${namespace}/${counterKey}`;
        
        // 2. 閲覧数を更新 または 取得する
        if (!sessionStorage.getItem('viewCounted')) {
            fetch(`${apiBase}/up`)
                .then(res => res.json())
                .then(data => {
                    currentViews = data.count || 0;
                    sessionStorage.setItem('viewCounted', 'true');
                }).catch(e => console.log('Counter is sleeping.'));
        } else {
            fetch(apiBase)
                .then(res => res.json())
                .then(data => {
                    currentViews = data.count || 0;
                }).catch(e => console.log('Counter is sleeping.'));
        }

        // 3. 秘密のコマンド（ロゴをクリックで表示）
        let clickCount = 0;
        let lastClickTime = 0;
        
        // ページ内のすべてのロゴ要素を対象にする
        const logos = document.querySelectorAll('.logo, .intro-logo');
        
        logos.forEach(logo => {
            logo.style.cursor = 'pointer'; 
            
            logo.addEventListener('click', () => {
                const now = Date.now();
                // 1秒以内の連続クリックをカウント
                if (now - lastClickTime < 1000) {
                    clickCount++;
                } else {
                    clickCount = 1;
                }
                lastClickTime = now;
                
                if (clickCount >= 5) {
                    showAdminDashboard(yearMonth, currentViews);
                    clickCount = 0;
                }
            });
        });

        function showAdminDashboard(month, views) {
            if (document.getElementById('admin-dashboard-secret')) return;

            const dash = document.createElement('div');
            dash.id = 'admin-dashboard-secret';
            dash.style.position = 'fixed';
            dash.style.bottom = '20px';
            dash.style.left = '20px';
            dash.style.background = 'rgba(5, 5, 8, 0.95)';
            dash.style.border = '1px solid var(--accent-color)';
            dash.style.boxShadow = '0 0 20px rgba(138,43,226,0.6)';
            dash.style.color = '#00d4ff';
            dash.style.padding = '20px 30px';
            dash.style.borderRadius = '10px';
            dash.style.zIndex = '10000000';
            dash.style.fontFamily = 'monospace';
            dash.style.fontSize = '1.2rem';
            dash.style.animation = 'fadeIn 0.5s ease-out';
            
            dash.innerHTML = `
                <div style="font-size:0.8rem; color:var(--tertiary-accent); margin-bottom:5px; text-shadow: 0 0 5px var(--tertiary-accent);">[ SYSTEM ADMIN ACCESS GRANTED ]</div>
                <div style="color:#fff; font-weight:bold; font-size:1.1rem;">${month} 閲覧数: <span style="font-size:1.8rem; color:var(--accent-color);">${views}</span> 回</div>
                <div style="font-size:0.75rem; color:#888; margin-top:10px; cursor:pointer; text-decoration:underline;" onclick="this.parentElement.remove()">[ CLOSE ]</div>
            `;
            
            document.body.appendChild(dash);
        }
    })();
});
