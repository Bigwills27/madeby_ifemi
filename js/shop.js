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
let currentImages = [];
let currentImageIndex = 0;
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
const searchDropdown = document.getElementById("searchDropdown");
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
  if (loadingIndicator) {
    loadingIndicator.style.display = "block";
  }
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
  isLoading = true;
}

function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }
  isLoading = false;
}

function showError(message = "Unable to load products. Please try again.") {
  if (errorMessage) {
    errorMessage.style.display = "block";
    const errorP = errorMessage.querySelector("p");
    if (errorP) {
      errorP.textContent = message;
    }
  }
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

  // Get images array with backward compatibility
  const images = item.images || (item.image ? [item.image] : []);
  const mainImage =
    images[0] ||
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xNDAgMTAwTDE3MCAzMEgxNTBWMTYwSDEzMFYxMzBIMTEwTDE0MCAxMDBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0iQXJpYWwiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+";

  const imageCountBadge =
    images.length > 1
      ? `<div class="image-count-badge">${images.length}</div>`
      : "";

  return `
    <div class="item-card" onclick="openModal('${item._id}')">
      <div class="item-image-container">
        <img src="${mainImage}" alt="${item.name}" class="item-image" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDI4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xNDAgMTAwTDE3MCAzMEgxNTBWMTYwSDEzMFYxMzBIMTEwTDE0MCAxMDBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0iQXJpYWwiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+'">
        ${imageCountBadge}
      </div>
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

  // Setup images with backward compatibility
  currentImages =
    currentModalItem.images ||
    (currentModalItem.image ? [currentModalItem.image] : []);
  currentImageIndex = 0;

  modalTitle.textContent = currentModalItem.name;
  modalDescription.textContent = currentModalItem.description;

  // Setup image gallery
  setupImageGallery();

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

function setupImageGallery() {
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");
  const imageIndicators = document.getElementById("imageIndicators");

  // Update main image
  updateMainImage();

  if (currentImages.length > 1) {
    // Show navigation controls
    galleryPrev.style.display = "block";
    galleryNext.style.display = "block";
    imageIndicators.style.display = "flex";

    // Setup indicators
    imageIndicators.innerHTML = currentImages
      .map(
        (_, index) =>
          `<div class="indicator-dot ${
            index === currentImageIndex ? "active" : ""
          }" 
            onclick="goToImage(${index})"></div>`
      )
      .join("");

    // Setup navigation event listeners
    galleryPrev.onclick = () => changeImage(-1);
    galleryNext.onclick = () => changeImage(1);
  } else {
    // Hide navigation controls for single image
    galleryPrev.style.display = "none";
    galleryNext.style.display = "none";
    imageIndicators.style.display = "none";
  }
}

function updateMainImage() {
  if (currentImages.length > 0) {
    modalImage.src = currentImages[currentImageIndex];
    modalImage.alt = currentModalItem.name;
  }
}

function changeImage(direction) {
  if (currentImages.length <= 1) return;

  currentImageIndex += direction;

  if (currentImageIndex >= currentImages.length) {
    currentImageIndex = 0;
  } else if (currentImageIndex < 0) {
    currentImageIndex = currentImages.length - 1;
  }

  updateMainImage();
  updateIndicators();
}

function goToImage(index) {
  if (index >= 0 && index < currentImages.length) {
    currentImageIndex = index;
    updateMainImage();
    updateIndicators();
  }
}

function updateIndicators() {
  const dots = document.querySelectorAll(".indicator-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentImageIndex);
  });
}

function closeModal() {
  if (modal) {
    modal.style.display = "none";
  }
  document.body.style.overflow = "auto";
  currentModalItem = null;
}

function updateQuantity(change) {
  if (!quantityInput) return;
  const currentValue = Number.parseInt(quantityInput.value);
  const newValue = Math.max(1, Math.min(10, currentValue + change));
  quantityInput.value = newValue;
}

function updateCartCount() {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? "flex" : "none";
  }
}

function updateLoadMoreButton() {
  if (!loadMoreBtn) return;

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
      image: currentImages[0] || currentModalItem.image, // Use first image with backward compatibility
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
  const cartModal = document.getElementById("cartModal");
  if (cartModal) {
    cartModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
}

function closeCartModal() {
  const cartModal = document.getElementById("cartModal");
  if (cartModal) {
    cartModal.style.display = "none";
  }
  document.body.style.overflow = "auto";
}

function updateCartModal() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!cartItemsContainer || !cartTotal) return;

  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some beautiful handmade items to get started!</p>
      </div>
    `;
    cartTotal.textContent = "₦0";
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
    }
    return;
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = false;
  }

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
  const submitBtn = document.querySelector(".checkout-submit-btn");

  // Add loading state
  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  setTimeout(() => {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;

    // Show confirmation instead of placing order
    showOrderConfirmation({
      customerName: formData.get("customerName"),
      phoneNumber: formData.get("phoneNumber"),
      customerEmail: formData.get("customerEmail"),
      deliveryMethod: formData.get("deliveryMethod"),
      items: cartItems,
      total: calculateCartTotal(),
    });
  }, 1000);
}

function showOrderConfirmation(orderData) {
  closeCheckoutModal();

  // Create confirmation modal content
  const confirmationHTML = `
    <div class="order-confirmation">
      <h3>Confirm Your Order</h3>
      <div class="confirmation-details">
        <div class="customer-info">
          <h4>Customer Information</h4>
          <p><strong>Name:</strong> ${orderData.customerName}</p>
          <p><strong>Phone:</strong> ${orderData.phoneNumber}</p>
          <p><strong>Email:</strong> ${orderData.customerEmail}</p>
          <p><strong>Delivery:</strong> ${
            orderData.deliveryMethod === "pickup"
              ? "Pickup (Free)"
              : "Delivery (Customer covers fees)"
          }</p>
        </div>
        <div class="order-items">
          <h4>Order Items</h4>
          ${orderData.items
            .map(
              (item) => `
            <div class="confirmation-item">
              <span>${item.name} (${item.size}, ${item.color}) x${
                item.quantity
              }</span>
              <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
          `
            )
            .join("")}
          <div class="confirmation-total">
            <strong>Total: ${formatPrice(orderData.total)}</strong>
          </div>
        </div>
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-secondary" onclick="goBackToCheckout()">Go Back</button>
        <button class="btn btn-primary" onclick="confirmAndPlaceOrder()" id="confirmOrderBtn">Confirm & Place Order</button>
      </div>
    </div>
  `;

  // Show confirmation modal
  const modal = document.getElementById("paymentModal");
  const modalBody = modal.querySelector(".payment-modal-body");
  modalBody.innerHTML = confirmationHTML;
  modal.style.display = "block";

  // Store order data for later use
  window.pendingOrderData = orderData;
}

function goBackToCheckout() {
  closePaymentModal();
  openCheckoutModal();
}

async function confirmAndPlaceOrder() {
  const orderData = window.pendingOrderData;
  const confirmBtn = document.getElementById("confirmOrderBtn");

  // Add loading state to confirm button
  confirmBtn.classList.add("loading");
  confirmBtn.disabled = true;
  confirmBtn.textContent = "Placing Order...";

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
    showToast("Order placed successfully!", "success");
    alert(
      "⚠️ Please make sure to copy your orderId on this next page and save it somewhere."
    );
    showPaymentModal(order._id, orderData);
  } catch (error) {
    console.error("Error submitting order:", error);
    showToast("Failed to submit order. Please try again.", "error");

    // Remove loading state on error
    confirmBtn.classList.remove("loading");
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm & Place Order";
  }
}

function showPaymentModal(orderId, orderData) {
  const modal = document.getElementById("paymentModal");
  const modalBody = modal.querySelector(".payment-modal-body");

  // Reset modal content to payment view
  modalBody.innerHTML = `
    <div class="payment-success">
      <div class="payment-icon">✓</div>
      <h4>Order Placed Successfully!</h4>
      <p>Order ID: <strong id="paymentOrderId">${orderId}</strong></p>
      <p>Total Amount: <strong id="paymentTotal">${formatPrice(
        orderData.total
      )}</strong></p>
      <input type="button" class="copy-btn" value="Copy Order ID" onclick="copyToClip('Order ID copied!', '${orderId}')">
    </div>

    <div class="payment-instructions">
      <h5>Payment Instructions:</h5>
      <p>Please make a transfer to the account below:</p>
      <div class="account-details">
        <div class="account-info">
          <strong>Account Number:</strong> 2051910798<br>
          <strong>Account Name:</strong> Akindele Ifemi<br>
          <strong>Bank:</strong> Zenith
        </div>
      </div>
      <p class="payment-note">
        After making the payment, please enter the name of the account you used below:
      </p>
    </div>

    <div class="payment-confirmation">
      <div class="form-group">
        <label for="accountName">Account Name Used for Payment *</label>
        <input type="text" id="accountName" class="form-input"
            placeholder="Enter the exact name on your account" required>
      </div>

      <div class="payment-actions">
        <button class="btn btn-primary" onclick="confirmPayment()">
          Confirm Payment Made
        </button>
      </div>
    </div>

    <div class="contact-info">
      <p><small>We will contact you via the phone number provided to confirm your order and payment.</small></p>
    </div>
  `;

  modal.style.display = "block";
}

function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  document.body.style.overflow = "auto";
}

function copyToClip(message, textToCopy) {
  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = textToCopy;
  tempTextArea.style.position = "absolute";
  tempTextArea.style.left = "-9999px";
  document.body.appendChild(tempTextArea);

  tempTextArea.select();
  tempTextArea.setSelectionRange(0, tempTextArea.value.length);

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      showToast(message, "success");
    } else {
      showToast("Failed to copy Order ID. Please copy it manually.", "error");
    }
  } catch (err) {
    showToast("Failed to copy Order ID. Please copy it manually.", "error");
  } finally {
    document.body.removeChild(tempTextArea);
  }
}

// Manual copy
document.addEventListener("DOMContentLoaded", () => {
  const paymentOrderIdElement = document.getElementById("paymentOrderId");
  const copyButton = document.querySelector(".copy-btn");

  if (paymentOrderIdElement && copyButton) {
    copyButton.addEventListener("click", () => {
      const textToCopy = paymentOrderIdElement.textContent;

      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = textToCopy;
      document.body.appendChild(tempTextArea);

      tempTextArea.select();
      try {
        document.execCommand("copy");
        copyButton.value = "Copied!";
        setTimeout(() => {
          copyButton.value = "Copy Order ID";
        }, 2000);
      } catch (err) {
        alert("Failed to copy text. Please copy it manually: " + textToCopy);
      } finally {
        document.body.removeChild(tempTextArea);
      }
    });
  }
});

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

// Show search suggestions in dropdown
function showSearchSuggestions(query) {
  if (!searchDropdown || !query.trim()) {
    hideSearchDropdown();
    return;
  }

  const filteredProducts = allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(query.toLowerCase()))
  );

  if (filteredProducts.length === 0) {
    hideSearchDropdown();
    return;
  }

  const suggestions = filteredProducts.slice(0, 6); // Show max 6 suggestions

  searchDropdown.innerHTML = suggestions
    .map((product) => {
      // Handle both old and new image structures
      let imageUrl = "./images/yarn.png"; // fallback
      if (product.images && product.images.length > 0) {
        imageUrl = product.images[0];
      } else if (product.image) {
        imageUrl = product.image; // for older products
      }

      // Handle price - check multiple possible property names and structures
      let price = "Price not available";

      if (product.prices && typeof product.prices === "object") {
        // Handle size-based pricing - show the first available price
        const priceValues = Object.values(product.prices).filter(
          (p) => p && typeof p === "number"
        );
        if (priceValues.length > 0) {
          const minPrice = Math.min(...priceValues);
          const maxPrice = Math.max(...priceValues);
          if (minPrice === maxPrice) {
            price = `₦${minPrice.toLocaleString()}`;
          } else {
            price = `₦${minPrice.toLocaleString()} - ₦${maxPrice.toLocaleString()}`;
          }
        }
      } else if (product.price && typeof product.price === "number") {
        price = `₦${product.price.toLocaleString()}`;
      } else if (product.cost && typeof product.cost === "number") {
        price = `₦${product.cost.toLocaleString()}`;
      } else if (product.amount && typeof product.amount === "number") {
        price = `₦${product.amount.toLocaleString()}`;
      }

      return `
      <div class="search-suggestion" data-product-id="${product._id}">
        <img src="${imageUrl}" alt="${product.name}" class="suggestion-image">
        <div class="suggestion-info">
          <div class="suggestion-name">${product.name}</div>
          <div class="suggestion-price">${price}</div>
        </div>
      </div>
    `;
    })
    .join("");

  // Add click listeners to suggestions
  searchDropdown
    .querySelectorAll(".search-suggestion")
    .forEach((suggestion) => {
      suggestion.addEventListener("click", () => {
        const productId = suggestion.dataset.productId;
        if (productId) {
          openModal(productId);
          hideSearchDropdown();
          searchInput.value = "";
        }
      });
    });

  searchDropdown.classList.add("show");
}

function hideSearchDropdown() {
  if (searchDropdown) {
    searchDropdown.classList.remove("show");
    searchDropdown.innerHTML = "";
  }
}

// Handle search input and Enter key for full search
async function handleSearch() {
  if (!searchInput) return;

  const query = searchInput.value.trim();

  if (query === "") {
    hideSearchDropdown();
    if (bestSellersContainer) {
      populateContainer(
        bestSellersContainer,
        getProductsByCategory("bestseller")
      );
    }

    if (newWorksContainer) {
      populateContainer(newWorksContainer, getProductsByCategory("new"));
    }

    if (catalogueContainer) {
      const catalogueItems = getProductsByCategory("catalogue");
      const initialItems = catalogueItems.slice(0, itemsPerLoad);
      populateContainer(catalogueContainer, initialItems);
      currentDisplayedItems = initialItems.length;
    }

    updateLoadMoreButton();
    return;
  }

  try {
    hideSearchDropdown();
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

    if (bestSellersContainer) {
      populateContainer(bestSellersContainer, bestSellers);
    }

    if (newWorksContainer) {
      populateContainer(newWorksContainer, newWorks);
    }

    if (catalogueContainer) {
      populateContainer(catalogueContainer, catalogueResults);
    }

    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }

    currentDisplayedItems = catalogueResults.length;

    hideLoading();
  } catch (error) {
    console.error("Search error:", error);
    hideLoading();
  }
}

async function initializePage() {
  try {
    if (errorMessage) {
      errorMessage.style.display = "none";
    }

    const products = await fetchProducts();

    if (products.length === 0) {
      showError("No products available at the moment.");
      return;
    }

    // Only populate containers if they exist (shop page)
    if (bestSellersContainer) {
      populateContainer(
        bestSellersContainer,
        getProductsByCategory("bestseller")
      );
    }

    if (newWorksContainer) {
      populateContainer(newWorksContainer, getProductsByCategory("new"));
    }

    if (catalogueContainer) {
      const catalogueItems = getProductsByCategory("catalogue");
      const initialItems = catalogueItems.slice(0, itemsPerLoad);
      populateContainer(catalogueContainer, initialItems);
      currentDisplayedItems = initialItems.length;
    }

    updateLoadMoreButton();
    updateCartCount();

    // Handle search parameter from URL (when redirected from index page)
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("search");
    if (searchQuery && searchInput) {
      searchInput.value = searchQuery;
      setTimeout(() => handleSearch(), 100);
    }

    // console.log("Products loaded:", products);
    // console.log("Sample product structure:", products[0]);
  } catch (error) {
    console.error("Error initializing page:", error);
    showError("Failed to initialize the page. Please refresh and try again.");
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializePage();
  loadCartFromStorage();

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "block") {
      closeModal();
    }
  });

  // Modal-specific event listeners (only exist on shop page)
  if (decreaseQtyBtn) {
    decreaseQtyBtn.addEventListener("click", () => updateQuantity(-1));
  }

  if (increaseQtyBtn) {
    increaseQtyBtn.addEventListener("click", () => updateQuantity(1));
  }

  if (quantityInput) {
    quantityInput.addEventListener("input", function () {
      const value = Number.parseInt(this.value);
      if (isNaN(value) || value < 1) {
        this.value = 1;
      } else if (value > 10) {
        this.value = 10;
      }
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", addToCart);
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreItems);
  }

  let searchTimeout;
  if (searchInput) {
    // Handle input for dropdown suggestions
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();

      if (query.length > 0) {
        searchTimeout = setTimeout(() => {
          showSearchSuggestions(query);
        }, 300);
      } else {
        hideSearchDropdown();
      }
    });

    // Handle Enter key for full search
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    });

    // Handle blur to hide dropdown
    searchInput.addEventListener("blur", () => {
      // Delay hiding to allow click on suggestions
      setTimeout(() => {
        hideSearchDropdown();
      }, 200);
    });
  }

  // Close search dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      searchDropdown &&
      !searchInput?.contains(e.target) &&
      !searchDropdown.contains(e.target)
    ) {
      hideSearchDropdown();
    }
  });

  // Handle cart click for both shop page (cartIcon) and index page (cart-toggle)
  const cartIcon = document.getElementById("cartIcon");
  const cartToggle = document.getElementById("cart-toggle");

  const handleCartClick = () => {
    const cartModal = document.getElementById("cartModal");

    if (!cartModal) {
      // If no cart modal exists (like on index page), redirect to shop
      if (cartItems.length > 0) {
        window.location.href = "./html/shop.html";
      } else {
        showToast("Your cart is empty", "info");
      }
      return;
    }

    if (cartItems.length > 0) {
      openCartModal();
    } else {
      showToast("Your cart is empty", "info");
    }
  };

  if (cartIcon) {
    cartIcon.addEventListener("click", handleCartClick);
  }

  if (cartToggle) {
    cartToggle.addEventListener("click", handleCartClick);
  }

  const customRequestBtn = document.querySelector(".custom-request-btn");
  if (customRequestBtn) {
    customRequestBtn.addEventListener("click", (e) => {
      showToast("This would redirect to Whatsapp.");
    });
  }

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

// Lightbox functionality
let currentLightboxIndex = 0;

function openLightbox() {
  const lightboxModal = document.getElementById("lightboxModal");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCounter = document.getElementById("lightboxCounter");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  if (currentImages.length === 0) return;

  currentLightboxIndex = currentImageIndex;

  lightboxImage.src = currentImages[currentLightboxIndex];
  lightboxImage.alt = currentModalItem.name;

  updateLightboxCounter();

  // Show/hide navigation buttons
  if (currentImages.length > 1) {
    lightboxPrev.style.display = "block";
    lightboxNext.style.display = "block";
  } else {
    lightboxPrev.style.display = "none";
    lightboxNext.style.display = "none";
  }

  lightboxModal.style.display = "block";
  document.body.style.overflow = "hidden";

  // Add keyboard navigation
  document.addEventListener("keydown", handleLightboxKeydown);
}

function closeLightbox() {
  const lightboxModal = document.getElementById("lightboxModal");
  lightboxModal.style.display = "none";
  document.body.style.overflow = "auto";

  // Remove keyboard navigation
  document.removeEventListener("keydown", handleLightboxKeydown);
}

function changeLightboxImage(direction) {
  if (currentImages.length <= 1) return;

  currentLightboxIndex += direction;

  if (currentLightboxIndex >= currentImages.length) {
    currentLightboxIndex = 0;
  } else if (currentLightboxIndex < 0) {
    currentLightboxIndex = currentImages.length - 1;
  }

  const lightboxImage = document.getElementById("lightboxImage");
  lightboxImage.src = currentImages[currentLightboxIndex];
  updateLightboxCounter();
}

function updateLightboxCounter() {
  const lightboxCounter = document.getElementById("lightboxCounter");
  if (currentImages.length > 1) {
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${
      currentImages.length
    }`;
    lightboxCounter.style.display = "block";
  } else {
    lightboxCounter.style.display = "none";
  }
}

function handleLightboxKeydown(event) {
  switch (event.key) {
    case "Escape":
      closeLightbox();
      break;
    case "ArrowLeft":
      changeLightboxImage(-1);
      break;
    case "ArrowRight":
      changeLightboxImage(1);
      break;
  }
}

// Make functions globally available for onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.changeImage = changeImage;
window.goToImage = goToImage;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.changeLightboxImage = changeLightboxImage;
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
