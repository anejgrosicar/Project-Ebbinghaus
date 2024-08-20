let decks = JSON.parse(localStorage.getItem('decks')) || [];
let currentDeck, currentCardIndex, currentDeckIndex;
// Check authentication status
function checkAuth() {
const token = localStorage.getItem('token');
if (!token) {
    // Instead of redirecting, just log a message
    console.log('Not authenticated, but allowing access for now');
}
}
// Call this at the beginning of your script
checkAuth();
// Update header
function updateHeader() {
const username = localStorage.getItem('username');
const loginButton = document.querySelector('.login-button');
if (username && loginButton) {
    loginButton.textContent = `Logout (${username})`;
    loginButton.onclick = logout;
} else if (loginButton) {
    loginButton.textContent = 'Login';
    loginButton.onclick = () => { window.location.href = '/login.html'; };
}
}
function logout() {
localStorage.removeItem('token');
localStorage.removeItem('username');
window.location.href = '/login.html';
}
// Call this after DOM content is loaded
updateHeader();
const reviewIntervals = [1, 2, 4, 7, 14, 30, 60, 90, 180, 360];
function saveDeck(deckName) {
decks.push({
    name: deckName,
    cards: [],
    lastReviewedDate: null,
    nextReview: null,
    currentIntervalIndex: 0,
    progress: 0,
    completed: false  // Add this line
});
localStorage.setItem('decks', JSON.stringify(decks));
updateDeckSelect();
displayDecks();
}
function addCard(deckIndex, frontContent, backContent, frontFile, backFile) {
const newCard = {
    front: {
        text: frontContent,
        file: null
    },
    back: {
        text: backContent,
        file: null
    },
    lastReview: null,
    nextReview: new Date().toISOString(),
    stage: reviewIntervals[0]
};
Promise.all([
    processFile(frontFile).then(result => newCard.front.file = result),
    processFile(backFile).then(result => newCard.back.file = result)
]).then(() => {
    decks[deckIndex].cards.push(newCard);
    localStorage.setItem('decks', JSON.stringify(decks));
    displayDecks();
});
}
function processFile(file) {
return new Promise((resolve, reject) => {
    if (!file) {
        resolve(null);
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        resolve({
            type: file.type,
            data: event.target.result
        });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
});
}
function displayFilePreview(file, previewElement) {
if (!file) {
    previewElement.innerHTML = '';
    return;
}
if (file.type.startsWith('image/')) {
    previewElement.innerHTML = `<img src="${file.data}" class="file-preview" alt="Preview">`;
} else if (file.type === 'application/pdf') {
    previewElement.innerHTML = `<iframe src="${file.data}" class="pdf-preview"></iframe>`;
}
}
function updateDeckSelect() {
const select = document.getElementById('deckSelect');
select.innerHTML = '<option value="">Select a Deck</option>' +
    decks.map((deck, index) => `<option value="${index}">${deck.name}</option>`).join('');
}
function updateProgress() {
const progress = (currentCardIndex / currentDeck.cardsToReview.length) * 100;
const progressFill = document.getElementById('progressFill');
if (progressFill) {
  progressFill.style.width = `${progress}%`;
}
}
function displayDecks() {
const currentDecksList = document.getElementById('currentDecksList');
const pastDecksList = document.getElementById('pastDecksList');
 currentDecksList.innerHTML = '';
pastDecksList.innerHTML = '';
const currentDecks = decks.filter(deck => !deck.completed);
const pastDecks = decks.filter(deck => deck.completed);
currentDecks.forEach((deck, index) => {
    const deckElement = createDeckElement(deck, index);
    currentDecksList.appendChild(deckElement);
});
if (pastDecks.length === 0) {
    pastDecksList.innerHTML = '<p>There are no past decks yet.</p>';
} else {
    pastDecks.forEach((deck, index) => {
        const deckElement = createDeckElement(deck, index + currentDecks.length);
        pastDecksList.appendChild(deckElement);
    });
}
}
function createDeckElement(deck, index) {
const deckElement = document.createElement('div');
deckElement.className = 'deck';
const deckHeader = document.createElement('div');
deckHeader.className = 'deck-header';
deckHeader.innerHTML = `
    <h3>${deck.name}</h3>
    <button class="settings-btn" onclick="showDeckSettings(${index})">⋮</button>
`;
deckElement.appendChild(deckHeader);
if (deck.cards.length === 0) {
    // For empty decks
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-deck-message';
    emptyMessage.textContent = 'Please add cards to this deck';
    deckElement.appendChild(emptyMessage);
} else {
    // For decks with cards
    const today = new Date();
    const nextReviewDate = new Date(deck.nextReview);
    const isReviewDue = today >= nextReviewDate;
    const progressStadium = document.createElement('div');
    progressStadium.className = 'progress-stadium';
    progressStadium.innerHTML = `<div class="progress-fill" style="width: ${deck.progress}%;"></div>`;
    deckElement.appendChild(progressStadium);
    const nextReviewParagraph = document.createElement('p');
    nextReviewParagraph.className = `next-review ${isReviewDue ? 'review-due' : ''}`;
    nextReviewParagraph.textContent = isReviewDue ? "It's time to review your deck!" : `Next review: ${nextReviewDate.toLocaleDateString()}`;
    deckElement.appendChild(nextReviewParagraph);
    const reviewButton = document.createElement('button');
    reviewButton.className = isReviewDue ? 'review-btn' : 'practice-btn';
    reviewButton.textContent = isReviewDue ? 'Review' : 'Practice';
    reviewButton.onclick = () => initiateReview(index, !isReviewDue);
    deckElement.appendChild(reviewButton);
}
return deckElement;
}
function calculateDeckProgress(deck) {
if (deck.cards.length === 0) return 0;
const completedReviews = deck.cards.reduce((sum, card) => {
    return sum + Math.min(reviewIntervals.indexOf(card.stage) + 1, 10);
}, 0);
return Math.round((completedReviews / (deck.cards.length * 10)) * 100);
}
function initiateReview(deckIndex, isPractice) {
console.log('Initiating review for deck:', deckIndex, 'Practice:', isPractice);
resetReviewState();
currentDeckIndex = deckIndex;
const deck = decks[deckIndex];
 console.log('Deck:', deck);
 if (!deck) {
    console.error('Deck not found');
    alert("Error: Deck not found.");
    return;
}
 if (deck.cards.length === 0) {
    console.log('No cards in deck');
    alert("This deck has no cards. Please add cards before reviewing.");
    return;
}
 startReview(isPractice);
}
function startReview(isPractice) {
console.log('Starting review. Practice:', isPractice);
closeSettingsModal();
closeConfirmModal();
currentDeck = JSON.parse(JSON.stringify(decks[currentDeckIndex])); // Create a deep copy
currentDeck.cardsToReview = [...currentDeck.cards]; // Copy all cards for review
currentDeck.isPractice = isPractice;
currentCardIndex = -1; // Set to -1 to start with an intro screen
console.log('Current deck:', currentDeck);
showReviewModal();
showIntroScreen();
}
function showIntroScreen() {
console.log('Showing intro screen');
const cardContent = document.getElementById('cardContent');
if (!cardContent) {
    console.error('Card content element not found');
    return;
}
 if (!currentDeck) {
    console.error('Current deck is null');
    cardContent.innerHTML = '<p>Error: No deck selected</p>';
    return;
}
 cardContent.innerHTML = `
    <h2>${currentDeck.isPractice ? 'Practice' : 'Review'} Session</h2>
    <p>Deck: ${currentDeck.name}</p>
    <p>Total cards: ${currentDeck.cardsToReview.length}</p>
    <button id="startReviewBtn">Start ${currentDeck.isPractice ? 'Practice' : 'Review'}</button>
`;
document.getElementById('startReviewBtn').addEventListener('click', startCardReview);
updateNavigationButtons(true);
}
function startCardReview() {
currentCardIndex = 0;
resetProgressBar();
showCard();
 // Show progress bar when review starts
const progressBar = document.getElementById('progressBar');
if (progressBar) {
    progressBar.style.display = 'block';
}
}
function showConfirmModal(message, onConfirm, onCancel) {
const modal = document.getElementById('confirmModal');
const modalContent = document.getElementById('confirmModalContent');
modalContent.innerHTML = `
    <p>${message}</p>
    <button onclick="onConfirmClick()">Yes</button>
    <button onclick="onCancelClick()">Cancel</button>
`;
modal.style.display = "block";
 window.onConfirmClick = () => {
    onConfirm();
    modal.style.display = "none";
};
 window.onCancelClick = () => {
    onCancel();
    modal.style.display = "none";
};
}
function closeConfirmModal() {
document.getElementById('confirmModal').style.display = "none";
}
function showReviewModal() {
console.log('Showing review modal');
const modal = document.getElementById('reviewModal');
if (!modal) {
    console.error('Review modal not found');
    return;
}
modal.style.display = "block";




const closeBtn = modal.querySelector(".close");
if (closeBtn) {
    closeBtn.onclick = closeReviewModal;
}




window.onclick = function(event) {
    if (event.target == modal) {
        closeReviewModal();
    }
}




// Hide progress bar initially
const progressBar = document.getElementById('progressBar');
if (progressBar) {
    progressBar.style.display = 'none';
}




// Remove navigation buttons
const navigationButtons = document.getElementById('navigationButtons');
if (navigationButtons) {
    navigationButtons.style.display = 'none';
}
}
function closeReviewModal() {
document.getElementById('reviewModal').style.display = "none";
}
function showCard() {
if (currentCardIndex >= currentDeck.cardsToReview.length) {
    finishReview();
    return;
}




const card = currentDeck.cardsToReview[currentCardIndex];
const cardContent = document.getElementById('cardContent');
cardContent.innerHTML = `
    <div class="card-front">
        <div>${card.front.text}</div>
        ${card.front.file ? createFilePreview(card.front.file) : ''}
    </div>
    <button onclick="showCardBack()">Show Answer</button>
`;




updateNavigationButtons();
updateProgressBar();
}




function showCardBack() {
const card = currentDeck.cardsToReview[currentCardIndex];
const cardContent = document.getElementById('cardContent');
cardContent.innerHTML = `
  <div class="card-back">
      <div>${card.back.text}</div>
      ${card.back.file ? createFilePreview(card.back.file) : ''}
  </div>
  <div class="confidence">
      <button onclick="rateConfidence(false)">Not Confident</button>
      <button onclick="rateConfidence(true)">Confident</button>
  </div>
`;
}
function createFilePreview(file) {
if (file.type.startsWith('image/')) {
    return `<img src="${file.data}" class="file-preview" alt="Preview">`;
} else if (file.type === 'application/pdf') {
    return `<iframe src="${file.data}" class="pdf-preview"></iframe>`;
}
return '';
}
function rateConfidence(isConfident) {
if (!isConfident) {
    const card = currentDeck.cardsToReview.splice(currentCardIndex, 1)[0];
    currentDeck.cardsToReview.push(card);
} else {
    currentCardIndex++;
}
updateProgressBar();
showCard();
}
function showPreviousCard() {
if (currentCardIndex > 0) {
    currentCardIndex--;
    showCard();
}
}
function showNextCard() {
currentCardIndex++;
showCard();
}
function updateNavigationButtons(isIntroScreen = false) {
if (!currentDeck || !currentDeck.cardsToReview) {
   console.log('No current deck or cards to review');
   return;
}
const prevButton = document.getElementById('prevCard');
const nextButton = document.getElementById('nextCard');
if (isIntroScreen) {
   if (prevButton) prevButton.style.display = 'none';
   if (nextButton) nextButton.style.display = 'none';
   return;
}
if (prevButton) {
   prevButton.style.display = currentCardIndex > 0 ? 'inline-block' : 'none';
}
if (nextButton) {
   nextButton.style.display = currentCardIndex < currentDeck.cardsToReview.length - 1 ? 'inline-block' : 'none';
}
}
function updateProgressBar() {
const progressFill = document.getElementById('progressFill');
const progress = (currentCardIndex / currentDeck.cardsToReview.length) * 100;
progressFill.style.width = `${progress}%`;
}




function resetProgressBar() {
const progressFill = document.getElementById('progressFill');
progressFill.style.width = '0%';
}




function finishReview() {
console.log('Finishing review');
closeReviewModal();
if (!currentDeck.isPractice) {
    currentDeck.lastReview = new Date().toISOString();
    currentDeck.currentIntervalIndex = Math.min(currentDeck.currentIntervalIndex + 1, reviewIntervals.length - 1);
    const nextInterval = reviewIntervals[currentDeck.currentIntervalIndex];
    currentDeck.nextReview = new Date(new Date().getTime() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
    currentDeck.progress = calculateDeckProgress(currentDeck);
 
    // Check if deck is completed
    if (currentDeck.currentIntervalIndex === reviewIntervals.length - 1) {
        currentDeck.completed = true;
    }
 
    decks[currentDeckIndex] = currentDeck; // Update the original deck
    localStorage.setItem('decks', JSON.stringify(decks));
}
currentCardIndex = -1; // Reset the card index
currentDeck = null; // Clear the current deck
displayDecks();
showCompletionMessage();
}
function showCompletionMessage() {
let message;
const nextReviewDate = new Date(Math.max(...currentDeck.cards.map(card => new Date(card.nextReview))));
 if (currentDeck.isPractice) {
    message = `Great job practicing! Your next review session is on ${nextReviewDate.toLocaleDateString()}.`;
} else {
    const reviewCycle = Math.min(reviewIntervals.indexOf(currentDeck.cards[0].stage) + 1, reviewIntervals.length);
    const daysUntilNextReview = Math.ceil((nextReviewDate - new Date()) / (1000 * 60 * 60 * 24));
    message = `Great job, your ${reviewCycle}th review cycle completed. Your next review is in ${daysUntilNextReview} days.`;
}
showCompletionModal(message);
}
function showCompletionModal(message) {
const modal = document.getElementById('completionModal');
const modalContent = document.getElementById('completionModalContent');
modalContent.innerHTML = `
    <span class="close" onclick="closeCompletionModal()">&times;</span>
    <p>${message}</p>
`;
modal.style.display = "block";
}
function closeCompletionModal() {
document.getElementById('completionModal').style.display = "none";
}
function clearFilePreviews() {
const frontPreview = document.getElementById('frontPreview');
const backPreview = document.getElementById('backPreview');
 if (frontPreview) frontPreview.innerHTML = '';
if (backPreview) backPreview.innerHTML = '';
document.getElementById('frontFile').value = '';
document.getElementById('backFile').value = '';
}
function deleteDeck(index) {
if (confirm('Are you sure you want to delete this deck?')) {
    decks.splice(index, 1);
    localStorage.setItem('decks', JSON.stringify(decks));
    displayDecks();
    closeSettingsModal();
}
}
function showDeckSettings(index) {
 const deck = decks[index];
 const modal = document.getElementById('settingsModal');
 const modalContent = document.getElementById('settingsModalContent');
 
 let content = `<h3>Settings for ${deck.name}</h3>`;
  // Add the new progress tracker
 content += `
   <div class="progress-tracker">
     ${createProgressTracker(deck)}
   </div>
 `;


 // Keep existing content
 content += `
   <p>Cards: ${deck.cards.length}</p>
   <p>Current Stage: ${deck.currentIntervalIndex + 1} of ${reviewIntervals.length}</p>
   <p>Next Review: ${new Date(deck.nextReview).toLocaleDateString()}</p>
   <button onclick="initiateReview(${index}, true)">Practice Now</button>
   <button onclick="viewCards(${index})">View Cards</button>
   <button onclick="deleteDeck(${index})">Delete Deck</button>
 `;
 
 modalContent.innerHTML = content;
 modal.style.display = "block";
}


function showDeckSettings(index) {
const deck = decks[index];
const modal = document.getElementById('settingsModal');
const modalContent = document.getElementById('settingsModalContent');
 let content = `<h3>Settings for ${deck.name}</h3>`;
 if (deck.cards.length === 0) {
    content += `
        <p class="empty-deck-message">This deck is empty. Add cards to start reviewing.</p>
        <button onclick="closeSettingsModal()">Close</button>
        <button onclick="deleteDeck(${index})">Delete Deck</button>
    `;
} else {
    const progressCircle = createProgressCircle(deck);
    content += `
        <div style="width: 220px; height: 220px; margin: 0 auto;">
            ${progressCircle}
        </div>
        <p>Cards: ${deck.cards.length}</p>
        <button onclick="initiateReview(${index}, true)">Practice Now</button>
        <button onclick="viewCards(${index})">View Cards</button>
        <button onclick="deleteDeck(${index})">Delete Deck</button>
    `;
}
 modalContent.innerHTML = content;
modal.style.display = "block";
}
function viewCards(deckIndex) {
const deck = decks[deckIndex];
const modal = document.getElementById('settingsModal');
const modalContent = document.getElementById('settingsModalContent');
 let content = `
  <h3>Cards in ${deck.name}</h3>
  <div class="cards-list">
`;
 deck.cards.forEach((card, cardIndex) => {
  content += `
    <div class="card-item">
      <div class="card-content">
        <strong>Front:</strong> ${card.front.text}<br>
        <strong>Back:</strong> ${card.back.text}
      </div>
      <div class="card-actions">
        <button class="edit-btn" onclick="editCard(${deckIndex}, ${cardIndex})">Edit</button>
        <button class="delete-btn" onclick="deleteCard(${deckIndex}, ${cardIndex})">Delete</button>
      </div>
    </div>
  `;
});
 content += `
  </div>
  <button class="back-to-settings" onclick="showDeckSettings(${deckIndex})">Back to Deck Settings</button>
`;
 modalContent.innerHTML = content;
modal.style.display = "block";
}
function editCard(deckIndex, cardIndex) {
const deck = decks[deckIndex];
const card = deck.cards[cardIndex];
const modal = document.getElementById('settingsModal');
const modalContent = document.getElementById('settingsModalContent');
 modalContent.innerHTML = `
    <h3>Edit Card</h3>
    <form id="editCardForm">
        <label for="editFront">Front:</label>
        <textarea id="editFront" required>${card.front.text}</textarea>
        <label for="editBack">Back:</label>
        <textarea id="editBack" required>${card.back.text}</textarea>
        <button type="submit">Save Changes</button>
    </form>
    <button onclick="viewCards(${deckIndex})">Cancel</button>
`;
 document.getElementById('editCardForm').onsubmit = function(e) {
    e.preventDefault();
    const newFront = document.getElementById('editFront').value;
    const newBack = document.getElementById('editBack').value;
    deck.cards[cardIndex].front.text = newFront;
    deck.cards[cardIndex].back.text = newBack;
    localStorage.setItem('decks', JSON.stringify(decks));
    viewCards(deckIndex);
};
}
function deleteCard(deckIndex, cardIndex) {
if (confirm('Are you sure you want to delete this card?')) {
    decks[deckIndex].cards.splice(cardIndex, 1);
    localStorage.setItem('decks', JSON.stringify(decks));
    viewCards(deckIndex);
}
}
function closeSettingsModal() {
document.getElementById('settingsModal').style.display = "none";
}
function resetReviewState() {
currentDeck = null;
currentCardIndex = -1;
const cardContent = document.getElementById('cardContent');
if (cardContent) {
   cardContent.innerHTML = '';
}
}
function createProgressCircle(deck) {
const size = 240; // Increased size for more space
const centerX = size / 2;
const centerY = size / 2;
const radius = 90;
const strokeWidth = 10;




const progress = deck.currentIntervalIndex / (reviewIntervals.length - 1);




let svgContent = `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="${strokeWidth}"/>
`;




// Progress arc
if (progress > 0) {
  const startAngle = -Math.PI / 2;
  const endAngle = progress * 2 * Math.PI + startAngle;
  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
   const startX = centerX + radius * Math.cos(startAngle);
  const startY = centerY + radius * Math.sin(startAngle);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY + radius * Math.sin(endAngle);




  svgContent += `
    <path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}"
          fill="none" stroke="#E57373" stroke-width="${strokeWidth}" stroke-linecap="butt" />
  `;
}




// Interval markers and labels
reviewIntervals.forEach((interval, index) => {
  const angle = (index / (reviewIntervals.length - 1)) * 2 * Math.PI - Math.PI / 2;
  const markerX = centerX + radius * Math.cos(angle);
  const markerY = centerY + radius * Math.sin(angle);




  // Small marker line
  svgContent += `
    <line x1="${markerX}" y1="${markerY}"
          x2="${markerX + 5 * Math.cos(angle)}" y2="${markerY + 5 * Math.sin(angle)}"
          stroke="${index <= deck.currentIntervalIndex ? '#E57373' : '#e0e0e0'}" stroke-width="2"/>
  `;




  // Label
  const labelRadius = radius + 20;
  let labelX = centerX + labelRadius * Math.cos(angle);
  let labelY = centerY + labelRadius * Math.sin(angle);




  // Adjust 360d and 1d label positions
  if (interval === 360) {
    labelX -= 15;
    labelY += 10;
  } else if (interval === 1) {
    labelX += 15;
    labelY += 10;
  }




  let textAnchor = "middle";
  if (angle < -Math.PI/4 && angle > -3*Math.PI/4) textAnchor = "end";
  if (angle > Math.PI/4 && angle < 3*Math.PI/4) textAnchor = "start";




  svgContent += `
    <text x="${labelX}" y="${labelY}"
          text-anchor="${textAnchor}"
          dominant-baseline="central"
          fill="#888" font-size="12">${interval}d</text>
  `;
});




svgContent += '</svg>';
return svgContent;
}
document.addEventListener('DOMContentLoaded', (event) => {
var coll = document.getElementsByClassName("collapsible");
var i;
for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight) {
          content.style.maxHeight = null;
          setTimeout(() => {
              content.style.display = "none";
          }, 300);
      } else {
          content.style.display = "block";
          content.style.maxHeight = content.scrollHeight + "px";
      }
  });
}
document.getElementById('deckForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const deckName = document.getElementById('deckName').value;
  saveDeck(deckName);
  this.reset();
});
document.getElementById('cardForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const deckIndex = document.getElementById('deckSelect').value;
  const frontContent = document.getElementById('frontContent').value;
  const backContent = document.getElementById('backContent').value;
  const frontFile = document.getElementById('frontFile').files[0];
  const backFile = document.getElementById('backFile').files[0];
  addCard(deckIndex, frontContent, backContent, frontFile, backFile);
  this.reset();
  clearFilePreviews();
});
document.getElementById('frontFile').addEventListener('change', function(e) {
  const existingPreview = document.getElementById('frontPreview');
  if (existingPreview) existingPreview.innerHTML = '';
  const file = e.target.files[0];
  if (file) {
      processFile(file).then(result => displayFilePreview(result, existingPreview));
  }
});
document.getElementById('backFile').addEventListener('change', function(e) {
  const existingPreview = document.getElementById('backPreview');
  if (existingPreview) existingPreview.innerHTML = '';
  const file = e.target.files[0];
  if (file) {
      processFile(file).then(result => displayFilePreview(result, existingPreview));
  }
});
const settingsModal = document.getElementById('settingsModal');
window.onclick = function(event) {
  if (event.target == settingsModal) {
      closeSettingsModal();
  }
}
// Initialize
updateDeckSelect();
displayDecks();
});
function updateLoginState() {
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const loginButton = document.querySelector('.login-button');
 if (token && username) {
  loginButton.textContent = `Logout (${username})`;
  loginButton.onclick = logout;
} else {
  loginButton.textContent = 'Login';
  loginButton.onclick = () => { window.location.href = '/login.html'; };
}
}
function logout() {
localStorage.removeItem('token');
localStorage.removeItem('username');
window.location.href = '/login.html';
}
// Call this when the page loads
document.addEventListener('DOMContentLoaded', updateLoginState);