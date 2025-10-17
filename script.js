let currentEventData = null;
let currentLightboxIndex = 0;
let startX = 0;
let currentX = 0;

// Load event from URL parameters on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    const title = urlParams.get('title');
    const description = urlParams.get('description');
    
    // Always show title and description from URL if available
    if (title) {
        document.getElementById('eventTitle').textContent = decodeURIComponent(title);
    }
    
    if (description) {
        document.getElementById('eventDescription').textContent = decodeURIComponent(description);
    }
    
    // Load event media if event ID is provided
    if (eventId) {
        document.getElementById('eventIdInput').value = eventId;
        loadEvent();
    }
});

async function loadEvent() {
    const eventIdInput = document.getElementById('eventIdInput').value.trim();
    let eventId = eventIdInput;
    
    // Extract event ID from URL if full URL is pasted
    if (eventIdInput.includes('?')) {
        const urlParams = new URLSearchParams(eventIdInput.split('?')[1]);
        eventId = urlParams.get('event') || eventIdInput;
    }
    
    if (!eventId) {
        showNotification('Please enter an event ID or URL');
        return;
    }
    
    try {
        showNotification('Loading event...');
        
        const response = await fetch(`/api/event/${eventId}`);
        if (!response.ok) {
            throw new Error('Event not found');
        }
        
        const eventData = await response.json();
        currentEventData = eventData;
        
        // Update UI with data from API (overrides URL parameters)
        document.getElementById('eventTitle').textContent = eventData.title || 'Event Gallery';
        document.getElementById('eventDescription').textContent = eventData.description || '';
        
        displayMedia(eventData.media);
        showNotification('Event loaded successfully!');
        
        // Update URL with current data
        const newUrl = `${window.location.pathname}?event=${eventId}&title=${encodeURIComponent(eventData.title)}&description=${encodeURIComponent(eventData.description || '')}`;
        window.history.replaceState({}, '', newUrl);
        
    } catch (error) {
        console.error('Error loading event:', error);
        showNotification('Error: Event not found');
        document.getElementById('gallery').innerHTML = `
            <div class="placeholder">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>Event not found. Please check the event ID.</p>
            </div>
        `;
    }
}

function displayMedia(media) {
    const gallery = document.getElementById('gallery');
    const placeholder = document.getElementById('placeholder');
    
    if (!media || media.length === 0) {
        gallery.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No media in this event yet.</p>
            </div>
        `;
        return;
    }
    
    placeholder.style.display = 'none';
    
    gallery.innerHTML = media.map((item, index) => `
        <div class="media-item" onclick="openLightbox(${index})" style="animation-delay: ${index * 0.1}s">
            ${item.type === 'video' ? `
                <video src="${item.file_path}" alt="Video ${index + 1}" loading="lazy">
                    Your browser does not support the video tag.
                </video>
            ` : `
                <img src="${item.file_path}" alt="Image ${index + 1}" loading="lazy">
            `}
            <div class="type-badge">
                <i class="fas fa-${item.type === 'video' ? 'video' : 'image'}"></i>
            </div>
        </div>
    `).join('');
}

function openLightbox(index) {
    if (!currentEventData || !currentEventData.media) return;
    
    currentLightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    const lightboxTrack = document.getElementById('lightboxTrack');
    const lightboxCounter = document.getElementById('lightboxCounter');
    
    // Create slides
    lightboxTrack.innerHTML = currentEventData.media.map((item, i) => `
        <div class="lightbox-slide">
            ${item.type === 'video' ? `
                <video class="lightbox-media" src="${item.file_path}" controls autoplay>
                    Your browser does not support the video tag.
                </video>
            ` : `
                <img class="lightbox-media" src="${item.file_path}" alt="Image ${i + 1}">
            `}
        </div>
    `).join('');
    
    // Set initial position
    updateLightboxPosition();
    updateLightboxCounter();
    
    // Show lightbox
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add touch events
    lightboxTrack.addEventListener('touchstart', handleTouchStart, { passive: false });
    lightboxTrack.addEventListener('touchmove', handleTouchMove, { passive: false });
    lightboxTrack.addEventListener('touchend', handleTouchEnd);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function handleTouchStart(e) {
    startX = e.touches[0].clientX;
    currentX = startX;
}

function handleTouchMove(e) {
    if (!startX) return;
    
    currentX = e.touches[0].clientX;
    e.preventDefault();
}

function handleTouchEnd() {
    if (!startX || !currentX) return;
    
    const diff = startX - currentX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            // Swipe left - next
            navigateLightbox(1);
        } else {
            // Swipe right - previous
            navigateLightbox(-1);
        }
    }
    
    startX = null;
    currentX = null;
}

function navigateLightbox(direction) {
    if (!currentEventData) return;
    
    currentLightboxIndex += direction;
    
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentEventData.media.length - 1;
    } else if (currentLightboxIndex >= currentEventData.media.length) {
        currentLightboxIndex = 0;
    }
    
    updateLightboxPosition();
    updateLightboxCounter();
}

function updateLightboxPosition() {
    const lightboxTrack = document.getElementById('lightboxTrack');
    if (lightboxTrack) {
        lightboxTrack.style.transform = `translateX(-${currentLightboxIndex * 100}vw)`;
    }
}

function updateLightboxCounter() {
    const lightboxCounter = document.getElementById('lightboxCounter');
    if (lightboxCounter && currentEventData) {
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentEventData.media.length}`;
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
    }
});

function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Allow pressing Enter in input field
document.getElementById('eventIdInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loadEvent();
    }
});
