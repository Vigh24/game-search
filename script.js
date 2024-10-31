const API_URL = 'https://flokixsteam.onrender.com';

// Add this at the top of script.js
const handleFetchError = async (response) => {
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }
    return response;
};

// Function to extract game info from Discord message content
function parseDiscordMessage(message) {
    // Extract file info from the message
    const fileMatch = message.match(/([^/]+\.(?:zip|rar))\s+(\d+(?:\.\d+)?\s*(?:KB|MB|GB))/i);
    if (fileMatch) {
        return {
            name: message.split('\n')[0].trim(), // First line is usually the game name
            fileName: fileMatch[1],
            size: fileMatch[2],
            messageId: message.id,
            available: true,
            channel: "1298651119563571231"
        };
    }
    return null;
}

// Function to update games database
async function updateGamesDatabase() {
    try {
        const response = await fetch(`${API_URL}/api/games`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const gamesData = await response.json();
        games = gamesData;
        
        // Update UI
        updateStats();
        updatePopularGames();
        updateFeaturedGames();
        updateLatestUpdates();
    } catch (error) {
        console.error('Error fetching games:', error);
        // Show error message to user
        document.getElementById('searchResult').innerHTML = `
            <div style="color: #ff4444; padding: 15px; background: rgba(255, 68, 68, 0.1); border-radius: 10px;">
                <h3>⚠️ Error</h3>
                <p>Unable to fetch games. Please try again later.</p>
            </div>
        `;
    }
}

// Function to update popular games tags
function updatePopularGames() {
    if (!games || games.length === 0) {
        console.log('No games available for popular games section');
        return;
    }

    // Get the latest 6 games
    const popularGames = games
        .slice(0, 6)
        .map(game => ({
            name: game.name,
            displayName: game.name.length > 25 ? 
                game.name.substring(0, 25) + '...' : 
                game.name
        }));

    console.log('Popular games:', popularGames);

    // Update the HTML
    document.querySelector('.game-tags').innerHTML = popularGames
        .map(game => `
            <span class="game-tag" onclick="quickSearch('${game.name}')">
                ${game.displayName}
            </span>
        `)
        .join('');
}

// Initialize games array
let games = [];

// Update the Discord URL format to include message ID
const DISCORD_BASE_URL = "https://discord.com/channels/1298628283734298655/";

// Add loading state
function setLoading(isLoading) {
    const searchButton = document.getElementById('search-icon');
    const input = document.getElementById('gameSearch');
    
    if (isLoading) {
        searchButton.style.opacity = '0.5';
        input.disabled = true;
    } else {
        searchButton.style.opacity = '1';
        input.disabled = false;
    }
}

// Update the search function
async function searchGame() {
    setLoading(true);
    try {
        const searchInput = document.getElementById('gameSearch').value.trim().toLowerCase();
        const resultDiv = document.getElementById('searchResult');
        
        if (searchInput === '') {
            resultDiv.innerHTML = '<p style="color: #6e8cff;">Please enter a game name to search.</p>';
            resultDiv.className = 'search-result show';
            return;
        }

        // First try exact match
        const exactMatch = games.find(g => g.name.toLowerCase() === searchInput);
        
        // If no exact match, try partial match
        const partialMatch = games.find(g => 
            g.name.toLowerCase().includes(searchInput) || 
            (g.fileName && g.fileName.toLowerCase().includes(searchInput))
        );

        const game = exactMatch || partialMatch;
        
        if (game) {
            resultDiv.innerHTML = `
                <div style="color: #3ba55c; padding: 15px; background: rgba(59, 165, 92, 0.1); border-radius: 10px;">
                    <h3>✅ ${game.name} is Available!</h3>
                    <div style="margin-top: 10px; color: #a9c7ff;">
                        <p>Size: ${game.size}</p>
                        ${game.note ? `<p>Note: ${game.note}</p>` : ''}
                        ${game.postedBy ? `<p>Added by: ${game.postedBy}</p>` : ''}
                        ${game.postedAt ? `<p>Added on: ${game.postedAt}</p>` : ''}
                        <a href="${DISCORD_BASE_URL}${game.channel}/${game.messageId}" 
                           target="_blank" 
                           style="display: inline-block; margin-top: 10px; background: #5865F2; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none;">
                            View in Discord
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Show similar games if available
            const similarGames = games.filter(g => 
                g.name.toLowerCase().includes(searchInput.substring(0, 3)) ||
                searchInput.includes(g.name.toLowerCase().substring(0, 3))
            ).slice(0, 3);

            let suggestionsHTML = '';
            if (similarGames.length > 0) {
                suggestionsHTML = `
                    <p style="margin-top: 10px; color: #a9c7ff;">Similar games:</p>
                    <div style="display: flex; gap: 10px; margin-top: 5px;">
                        ${similarGames.map(g => `
                            <span class="game-tag" onclick="quickSearch('${g.name}')">${g.name}</span>
                        `).join('')}
                    </div>
                `;
            }

            resultDiv.innerHTML = `
                <div style="color: #faa61a; padding: 15px; background: rgba(250, 166, 26, 0.1); border-radius: 10px;">
                    <h3>🔍 Game Not Found</h3>
                    <p>We couldn't find "${searchInput}" in our database.</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #a9c7ff;">
                        Try searching for another game or check the spelling.
                    </p>
                    ${suggestionsHTML}
                </div>
            `;
        }
        
        resultDiv.className = 'search-result show';
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('searchResult').innerHTML = `
            <div style="color: #ff4444; padding: 15px; background: rgba(255, 68, 68, 0.1); border-radius: 10px;">
                <h3>⚠️ Error</h3>
                <p>Search failed. Please try again later.</p>
            </div>
        `;
    } finally {
        setLoading(false);
    }
}

// Update the quickSearch function to be more robust
function quickSearch(gameName) {
    // Set the search input value
    const searchInput = document.getElementById('gameSearch');
    searchInput.value = gameName;
    
    // Trigger the search
    searchGame();
    
    // Scroll the search result into view if needed
    document.getElementById('searchResult').scrollIntoView({ behavior: 'smooth' });
}

// Update games database periodically
updateGamesDatabase();
setInterval(updateGamesDatabase, 5 * 60 * 1000); // Update every 5 minutes

// Keep the existing event listeners
document.getElementById('gameSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchGame();
    }
});

document.getElementById('gameSearch').addEventListener('input', function(e) {
    if (this.value.trim() === '') {
        document.getElementById('searchResult').className = 'search-result';
    }
});

function updateStats() {
    // Update total games count
    document.getElementById('totalGames').textContent = games.length;

    // Count games added today
    const today = new Date().toDateString();
    const todayGames = games.filter(game => {
        const gameDate = new Date(game.timestamp).toDateString();
        return gameDate === today;
    }).length;
    
    document.getElementById('todayGames').textContent = todayGames;
}

function updateFeaturedGames() {
    const featuredGames = games.slice(0, 6); // Get first 6 games
    const featuredHTML = featuredGames.map(game => `
        <div class="game-card" onclick="quickSearch('${game.name}')">
            <div class="game-icon">🎮</div>
            <div class="game-name">${game.name}</div>
            <div class="game-size">${game.size}</div>
        </div>
    `).join('');
    document.getElementById('featuredGames').innerHTML = featuredHTML;
}

function updateLatestUpdates() {
    const updates = games.slice(0, 5).map(game => `
        <div class="update-item">
            <div class="update-title">📥 ${game.name}</div>
            <div class="update-info">Added by ${game.postedBy} • ${game.postedAt}</div>
        </div>
    `).join('');
    document.getElementById('latestUpdates').innerHTML = updates;
}

// Add this function to count monthly games
function updateFooterStats() {
    // Count games added this month
    const currentDate = new Date();
    const monthlyGames = games.filter(game => {
        const gameDate = new Date(game.timestamp);
        return gameDate.getMonth() === currentDate.getMonth() &&
               gameDate.getFullYear() === currentDate.getFullYear();
    }).length;
    
    // Update monthly games count
    document.getElementById('monthlyGames').textContent = monthlyGames;

    // Update active users (this could be the number of online members)
    const activeUsers = document.querySelector('.members-text')
        .textContent.split(' ')[0];
    document.getElementById('activeUsers').textContent = activeUsers;
}

// Add this function to update member counts
async function updateMemberCounts() {
    try {
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        };
        const response = await fetch(`${API_URL}/api/stats`, fetchOptions);
        const stats = await response.json();
        
        // Update total members
        document.querySelectorAll('.members-text').forEach(el => {
            el.textContent = `${stats.onlineMembers} members online`;
        });
        
        // Update stats cards
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = 
            stats.totalMembers.toLocaleString();
    } catch (error) {
        console.error('Error updating member counts:', error);
    }
}

// Update the updateAllSections function
async function updateAllSections() {
    await updateGamesDatabase();
    await updateMemberCounts();
    updateStats();
    updateFeaturedGames();
    updateLatestUpdates();
    updateFooterStats();
}

// Initial load
updateAllSections();

// Add periodic updates for the footer stats
setInterval(updateFooterStats, 60 * 1000); // Update every minute

// Add periodic updates for member counts
setInterval(updateMemberCounts, 60 * 1000); // Update every minute

// Add this at the beginning of your script.js
document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) {
        event.preventDefault(); // Prevent pinch zoom
    }
}, { passive: false });

// Prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add at the top of your script.js
document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });

document.addEventListener('gesturestart', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gesturechange', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gestureend', function(event) {
    event.preventDefault();
}, { passive: false });

// Add at the top of your script
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
});

document.addEventListener('touchmove', function(e) {
    if (e.scale !== 1) {
        e.preventDefault();
    }
}, { passive: false });

// Prevent double tap zoom
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add this to handle iOS Safari bouncing effect
document.body.addEventListener('touchmove', function(e) {
    if (e.target.closest('.container')) return;
    e.preventDefault();
}, { passive: false });

// Add these at the very top of the file
document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
    return false;
}, { passive: false });

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
    return false;
}, { passive: false });

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
    return false;
}, { passive: false });

// Prevent double tap zoom
document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add this to prevent pinch zoom on iOS Safari
window.addEventListener('load', function() {
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        if (e.scale !== undefined && e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });
});

// Add these at the very top of your script file
window.addEventListener('load', function() {
    // Prevent zoom on iOS
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1 || e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent all gestures
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
        document.addEventListener(eventName, function(e) {
            e.preventDefault();
            return false;
        }, { passive: false });
    });
});

// Keep this single viewport lock function
function lockViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
}

window.addEventListener('load', lockViewport);
window.addEventListener('orientationchange', lockViewport);

// Add debouncing for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update search function with debouncing
const debouncedSearch = debounce(searchGame, 300);

// Update event listener
document.getElementById('gameSearch').addEventListener('input', debouncedSearch);