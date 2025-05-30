// API Configuration
const API_BASE_URL = "https://ifemade-server.onrender.com/api";

// Toast notification system
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">
        ${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}
      </div>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

// Global variables
let allProducts = [];
let currentDisplayedItems = 0;
const itemsPerLoad = 20;
let currentModalItem = null;
const cartItems = [];
let isLoading = false;

// DOM elements
const bestSellersContainer = document.getElementById("bestSellers");
const newWorksContainer = document.getElementById("newWorks");
const catalogueContainer = document.getElementById("catalogueGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const modal = document.getElementById("itemModal");
const closeModalBtn = document.getElementById("closeModal");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");

// Modal elements
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalPrice = document.getElementById("modalPrice");
const modalDescription = document.getElementById("modalDescription");
const quantityInput = document.getElementById("quantityInput");
const decreaseQtyBtn = document.getElementById("decreaseQty");
const increaseQtyBtn = document.getElementById("increaseQty");
const addToCartBtn = document.getElementById("addToCartBtn");
const customMessage = document.getElementById("customMessage");

// Cart management functions
function saveCartToStorage() {
  localStorage.setItem("madebyifemi_cart", JSON.stringify(cartItems));
}

function loadCartFromStorage() {
  const savedCart = localStorage.getItem("madebyifemi_cart");
  if (savedCart) {
    cartItems.length = 0;
    cartItems.push(...JSON.parse(savedCart));
    updateCartCount();
  }
}

function removeFromCart(index) {
  cartItems.splice(index, 1);
  saveCartToStorage();
  updateCartCount();
  updateCartModal();
  showToast("Item removed from cart", "info");
}

function updateCartItemQuantity(index, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(index);
    return;
  }

  cartItems[index].quantity = Math.min(10, Math.max(1, newQuantity));
  saveCartToStorage();
  updateCartCount();
  updateCartModal();
}

function clearCart() {
  cartItems.length = 0;
  saveCartToStorage();
  updateCartCount();
  updateCartModal();
}

function calculateCartTotal() {
  return cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

// Loading and error functions
function showLoading() {
  loadingIndicator.style.display = "block";
  errorMessage.style.display = "none";
  isLoading = true;
}

function hideLoading() {
  loadingIndicator.style.display = "none";
  isLoading = false;
}

function showError(message = "Unable to load products. Please try again.") {
  errorMessage.style.display = "block";
  errorMessage.querySelector("p").textContent = message;
  hideLoading();
}

// API functions
async function fetchProducts() {
  try {
    showLoading();
    const response = await fetch(`${API_BASE_URL}/products`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products = await response.json();
    allProducts = products;
    hideLoading();
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    showError(
      "Failed to load products. Please check your connection and try again."
    );
    hideLoading();
    return [];
  }
}

async function searchProducts(query) {
  if (!query.trim()) {
    return allProducts;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/products/search/${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}

// Utility functions
function formatPrice(price) {
  return `₦${(price / 1000).toFixed(0)}k`;
}

function createItemCard(item) {
  const priceS = item?.prices?.S;
  const priceDisplay = priceS ? formatPrice(priceS) : "Price Unavailable";

  return `
    <div class="item-card" onclick="openModal('${item._id}')">
      <img src="${item.image}" alt="${item.name}" class="item-image" 
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xNDAgMTAwTDE3MCAzMEgxNTBWMTYwSDEzMFYxMzBIMTEwTDE0MCAxMDBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0iQXJpYWwiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+'">
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <div class="item-price">${priceDisplay}</div>
        <button class="view-details-btn" onclick="event.stopPropagation(); openModal('${item._id}')">
          View Details
        </button>
      </div>
    </div>
  `;
}

function populateContainer(container, items) {
  if (items.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666; width: 100%;">No products found in this category.</p>';
    return;
  }
  container.innerHTML = items.map(createItemCard).join("");
}

function getProductsByCategory(category) {
  return allProducts.filter(
    (product) => product.categories && product.categories.includes(category)
  );
}

// Modal functions
function openModal(itemId) {
  currentModalItem = allProducts.find((item) => item._id === itemId);
  if (!currentModalItem) return;

  modalTitle.textContent = currentModalItem.name;
  modalImage.src = currentModalItem.image;
  modalImage.alt = currentModalItem.name;
  modalDescription.textContent = currentModalItem.description;

  // Set default size
  const defaultSize = "S";
  document.getElementById("sizeS").checked = true;

  // Display default price based on size
  const priceForSize = currentModalItem.prices?.[defaultSize];
  modalPrice.textContent = priceForSize
    ? formatPrice(priceForSize)
    : "Price not available";

  // Reset other values
  document.getElementById("colorCream").checked = true;
  quantityInput.value = 1;
  customMessage.value = "";

  // Optional: Attach event listeners to update price on size change
  const sizes = ["S", "L", "XL", "XXL", "XXXL"];
  sizes.forEach((size) => {
    const sizeRadio = document.getElementById(`size${size}`);
    if (sizeRadio) {
      sizeRadio.addEventListener("change", () => {
        if (sizeRadio.checked) {
          const selectedPrice = currentModalItem.prices?.[size];
          modalPrice.textContent = selectedPrice
            ? formatPrice(selectedPrice)
            : "Price not available";
        }
      });
    }
  });

  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
  currentModalItem = null;
}

function updateQuantity(change) {
  const currentValue = Number.parseInt(quantityInput.value);
  const newValue = Math.max(1, Math.min(10, currentValue + change));
  quantityInput.value = newValue;
}

function updateCartCount() {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  cartCount.style.display = totalItems > 0 ? "flex" : "none";
}

function updateLoadMoreButton() {
  const catalogueItems = getProductsByCategory("catalogue");
  const remainingItems = catalogueItems.length - currentDisplayedItems;

  if (remainingItems <= 0) {
    loadMoreBtn.style.display = "none";
  } else {
    const itemsToShow = Math.min(itemsPerLoad, remainingItems);
    loadMoreBtn.textContent = `Load More Items (${itemsToShow})`;
    loadMoreBtn.style.display = "block";
  }
}

function addToCart() {
  if (!currentModalItem) return;

  const selectedSize = document.querySelector(
    'input[name="size"]:checked'
  ).value;
  const selectedColor = document.querySelector(
    'input[name="color"]:checked'
  ).value;
  const quantity = Number.parseInt(quantityInput.value);
  const message = customMessage.value.trim();

  const existingItemIndex = cartItems.findIndex(
    (item) =>
      item.id === currentModalItem._id &&
      item.size === selectedSize &&
      item.color === selectedColor &&
      item.customMessage === message
  );

  const selectedPrice = currentModalItem.prices?.[selectedSize] || 0;

  if (existingItemIndex > -1) {
    cartItems[existingItemIndex].quantity += quantity;
  } else {
    const cartItem = {
      id: currentModalItem._id,
      name: currentModalItem.name,
      price: selectedPrice, // ✅ SET CORRECT PRICE
      size: selectedSize,
      color: selectedColor,
      quantity: quantity,
      image: currentModalItem.image,
      customMessage: message,
    };
    cartItems.push(cartItem);
  }

  saveCartToStorage();
  updateCartCount();
  showToast(
    `Added ${quantity} ${currentModalItem.name}(s) to cart!`,
    "success"
  );
  closeModal();
}

// Cart modal functions
function openCartModal() {
  updateCartModal();
  document.getElementById("cartModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeCartModal() {
  document.getElementById("cartModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function updateCartModal() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some beautiful handmade items to get started!</p>
      </div>
    `;
    cartTotal.textContent = "₦0";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;

  cartItemsContainer.innerHTML = cartItems
    .map((item, index) => {
      const priceDisplay = item.price
        ? formatPrice(item.price)
        : "Price Unavailable";
      const subtotal = item.price
        ? formatPrice(item.price * item.quantity)
        : "N/A";

      return `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-image" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MCAzMEw1MCA0MEg0NVY1MEgzNVY0MEgzMEw0MCAzMFoiIGZpbGw9IiNDQ0MiLz4KPC9zdmc+'">
          <div class="cart-item-details">
            <h4 class="cart-item-name">${item.name}</h4>
            <div class="cart-item-options">
              <span>Size: ${item.size}</span>
              <span>Color: ${item.color}</span>
            </div>
            ${
              item.customMessage
                ? `<div class="cart-item-message">Custom: ${item.customMessage}</div>`
                : ""
            }
            <div class="cart-item-price">${priceDisplay} each</div>
          </div>
          <div class="cart-item-controls">
            <div class="cart-quantity-control">
              <button class="cart-quantity-btn" onclick="updateCartItemQuantity(${index}, ${
        item.quantity - 1
      })">-</button>
              <span class="cart-quantity">${item.quantity}</span>
              <button class="cart-quantity-btn" onclick="updateCartItemQuantity(${index}, ${
        item.quantity + 1
      })">+</button>
            </div>
            <div class="cart-item-subtotal">${subtotal}</div>
            <button class="cart-remove-btn" onclick="removeFromCart(${index})" title="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.price || 0) * item.quantity;
  }, 0);

  cartTotal.textContent = formatPrice(total);
}

// Checkout functions
function openCheckoutModal() {
  closeCartModal();
  document.getElementById("checkoutModal").style.display = "block";
  updateCheckoutSummary();
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function updateCheckoutSummary() {
  const checkoutItems = document.getElementById("checkoutItems");
  const checkoutTotal = document.getElementById("checkoutTotal");

  checkoutItems.innerHTML = cartItems
    .map(
      (item) => `
    <div class="checkout-item">
      <span class="checkout-item-name">${item.name} (${item.size}, ${
        item.color
      })</span>
      <span class="checkout-item-quantity">x${item.quantity}</span>
      <span class="checkout-item-price">${formatPrice(
        item.price * item.quantity
      )}</span>
    </div>
  `
    )
    .join("");

  checkoutTotal.textContent = formatPrice(calculateCartTotal());
}

async function submitOrder() {
  const form = document.getElementById("checkoutForm");
  const formData = new FormData(form);

  const orderData = {
    customerName: formData.get("customerName"),
    phoneNumber: formData.get("phoneNumber"),
    deliveryMethod: formData.get("deliveryMethod"),
    items: cartItems,
    total: calculateCartTotal(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error("Failed to submit order");
    }

    const order = await response.json();

    clearCart();
    closeCheckoutModal();
    showPaymentModal(order._id, orderData);
  } catch (error) {
    console.error("Error submitting order:", error);
    showToast("Failed to submit order. Please try again.", "error");
  }
}

function showPaymentModal(orderId, orderData) {
  document.getElementById("paymentOrderId").textContent = orderId;
  document.getElementById("paymentTotal").textContent = formatPrice(
    orderData.total
  );
  document.getElementById("paymentModal").style.display = "block";
}

function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function copyToClip(message, textToCopy) {
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      showToast(message, "success");
    })
    .catch((err) => {
      console.error("Failed to copy text:", err);
      showToast("Failed to copy Order ID. Please copy it manually.", "error");
    });
}

async function confirmPayment() {
  const accountName = document.getElementById("accountName").value.trim();
  const orderId = document.getElementById("paymentOrderId").textContent;

  if (!accountName) {
    showToast("Please enter the account name used for payment", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentAccountName: accountName,
        paymentStatus: "payment_made",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update payment status");
    }

    closePaymentModal();

    // ✅ Auto-copy the full order ID
    copyToClip(
      `Your Order ID (${orderId}) has been copied to your clipboard. Please save it for future reference.`,
      orderId
    );

    showToast(
      "Thank you! Your order has been received. We will contact you shortly to confirm payment.",
      "success"
    );
  } catch (error) {
    console.error("Error confirming payment:", error);
    showToast("Failed to confirm payment. Please try again.", "error");
  }
}

function loadMoreItems() {
  const catalogueItems = getProductsByCategory("catalogue");
  const remainingItems = catalogueItems.length - currentDisplayedItems;

  if (remainingItems <= 0) {
    return;
  }

  const itemsToShow = Math.min(itemsPerLoad, remainingItems);
  const newItems = catalogueItems.slice(
    currentDisplayedItems,
    currentDisplayedItems + itemsToShow
  );

  catalogueContainer.innerHTML += newItems.map(createItemCard).join("");
  currentDisplayedItems += itemsToShow;

  updateLoadMoreButton();
}

async function handleSearch() {
  const query = searchInput.value.trim();

  if (query === "") {
    populateContainer(
      bestSellersContainer,
      getProductsByCategory("bestseller")
    );
    populateContainer(newWorksContainer, getProductsByCategory("new"));

    const catalogueItems = getProductsByCategory("catalogue");
    const initialItems = catalogueItems.slice(0, itemsPerLoad);
    populateContainer(catalogueContainer, initialItems);
    currentDisplayedItems = initialItems.length;
    updateLoadMoreButton();
    return;
  }

  try {
    showLoading();
    const searchResults = await searchProducts(query);

    const bestSellers = searchResults.filter(
      (item) => item.categories && item.categories.includes("bestseller")
    );
    const newWorks = searchResults.filter(
      (item) => item.categories && item.categories.includes("new")
    );
    const catalogueResults = searchResults.filter(
      (item) => item.categories && item.categories.includes("catalogue")
    );

    populateContainer(bestSellersContainer, bestSellers);
    populateContainer(newWorksContainer, newWorks);
    populateContainer(catalogueContainer, catalogueResults);

    loadMoreBtn.style.display = "none";
    currentDisplayedItems = catalogueResults.length;

    hideLoading();
  } catch (error) {
    console.error("Search error:", error);
    hideLoading();
  }
}

async function initializePage() {
  try {
    errorMessage.style.display = "none";

    const products = await fetchProducts();

    if (products.length === 0) {
      showError("No products available at the moment.");
      return;
    }

    populateContainer(
      bestSellersContainer,
      getProductsByCategory("bestseller")
    );
    populateContainer(newWorksContainer, getProductsByCategory("new"));

    const catalogueItems = getProductsByCategory("catalogue");
    const initialItems = catalogueItems.slice(0, itemsPerLoad);
    populateContainer(catalogueContainer, initialItems);
    currentDisplayedItems = initialItems.length;

    updateLoadMoreButton();
    updateCartCount();

    console.log(`Loaded ${products.length} products from database`);
  } catch (error) {
    console.error("Error initializing page:", error);
    showError("Failed to initialize the page. Please refresh and try again.");
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializePage();
  loadCartFromStorage();

  closeModalBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") {
      closeModal();
    }
  });

  decreaseQtyBtn.addEventListener("click", () => updateQuantity(-1));
  increaseQtyBtn.addEventListener("click", () => updateQuantity(1));

  quantityInput.addEventListener("input", function () {
    const value = Number.parseInt(this.value);
    if (isNaN(value) || value < 1) {
      this.value = 1;
    } else if (value > 10) {
      this.value = 10;
    }
  });

  addToCartBtn.addEventListener("click", addToCart);
  loadMoreBtn.addEventListener("click", loadMoreItems);

  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 500);
  });

  document.getElementById("cartIcon").addEventListener("click", () => {
    if (cartItems.length > 0) {
      openCartModal();
    } else {
      showToast("Your cart is empty", "info");
    }
  });

  document
    .querySelector(".custom-request-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      alert("This would redirect to a custom order form or contact page.");
    });

  const buttons = document.querySelectorAll(
    ".btn, .view-details-btn, .load-more-btn, .custom-request-btn"
  );
  buttons.forEach((button) => {
    button.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-4px)";
    });
    button.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
    });
  });
});

// Make functions globally available for onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.initializePage = initializePage;
window.openCartModal = openCartModal;
window.closeCartModal = closeCartModal;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.submitOrder = submitOrder;
window.closePaymentModal = closePaymentModal;
window.confirmPayment = confirmPayment;
