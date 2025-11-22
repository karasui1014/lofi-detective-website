document.addEventListener('DOMContentLoaded', () => {
    // Custom Cursor
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        // Smooth follow for outline
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: "forwards" });
    });

    // Hover effect for cursor
    document.querySelectorAll('a, button, .music-item').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorOutline.style.width = '60px';
            cursorOutline.style.height = '60px';
            cursorOutline.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
        });
        el.addEventListener('mouseleave', () => {
            cursorOutline.style.width = '40px';
            cursorOutline.style.height = '40px';
            cursorOutline.style.backgroundColor = 'transparent';
        });
    });

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Parallax Effect for Hero Image
    const heroContainer = document.querySelector('#hero');
    const heroImage = document.querySelector('.hero-image-container');

    heroContainer.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
        heroImage.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });

    heroContainer.addEventListener('mouseleave', () => {
        heroImage.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
    });

    // BGM Logic
    const bgm = document.getElementById('bgm');
    const soundToggle = document.getElementById('sound-toggle');
    const soundIcon = soundToggle.querySelector('.icon');
    const nextTrackBtn = document.getElementById('next-track');
    const trackNameDisplay = document.getElementById('track-name');
    let isPlaying = false;

    // Playlist
    const playlist = [
        { name: '桜色のミステリー', src: 'assets/sakurairo_mystery.mp3' },
        { name: '午前3時の証拠', src: 'assets/3am_evidence.mp3' }
    ];
    let currentTrackIndex = 0;

    // Set initial volume (very faint)
    bgm.volume = 0.1;

    function loadTrack(index) {
        bgm.src = playlist[index].src;
        trackNameDisplay.textContent = playlist[index].name;
        bgm.load();
        if (isPlaying) bgm.play();
    }

    function toggleSound() {
        if (isPlaying) {
            bgm.pause();
            soundIcon.textContent = '🔇';
        } else {
            bgm.play().then(() => {
                soundIcon.textContent = '🔊';
            }).catch(error => {
                console.log("Audio play failed:", error);
            });
        }
        isPlaying = !isPlaying;
    }

    soundToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound();
    });

    nextTrackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
    });

    // Try to start BGM on first interaction
    document.addEventListener('click', function firstClick() {
        if (!isPlaying) {
            bgm.play().then(() => {
                isPlaying = true;
                soundIcon.textContent = '🔊';
            }).catch(error => {
                console.log("Auto-start blocked:", error);
            });
        }
        document.removeEventListener('click', firstClick);
    }, { once: true });

    // Intersection Observer for Fade-ins
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.content-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
        observer.observe(section);
    });
});
