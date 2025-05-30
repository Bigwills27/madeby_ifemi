// API Configuration
const API_BASE_URL = "https://ifemade-server.onrender.com/api";

// Global variables
let currentEditingId = null;
let currentOrders = [];

/**
 * Formats price in Nigerian Naira
 */
function formatPrice(price) {
  return `₦${(price / 1000).toFixed(0)}k`;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Show message
 */
function showMessage(containerId, message, type = "success") {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="message ${type}">${message}</div>`;
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

/**
 * Show loading state for button
 */
function setButtonLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  const btnText = button.querySelector(".btn-text");
  const spinner = button.querySelector(".loading-spinner");

  if (loading) {
    button.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "flex";
  } else {
    button.disabled = false;
    btnText.style.display = "inline";
    spinner.style.display = "none";
  }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active class from all nav tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show selected tab content
  document.getElementById(tabName).classList.add("active");

  // Add active class to clicked nav tab
  event.target.classList.add("active");

  // Load data based on tab
  if (tabName === "manage-products") {
    loadProducts();
  } else if (tabName === "dashboard") {
    loadDashboardStats();
  } else if (tabName === "orders") {
    loadOrders();
  }
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
  try {
    // Load product stats
    const productResponse = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (productResponse.ok) {
      const stats = await productResponse.json();
      document.getElementById("totalProducts").textContent =
        stats.totalProducts;
      document.getElementById("bestsellerCount").textContent =
        stats.bestsellerCount;
      document.getElementById("newCount").textContent = stats.newCount;
      document.getElementById("catalogueCount").textContent =
        stats.catalogueCount;
    }

    // Load order stats
    const orderResponse = await fetch(`${API_BASE_URL}/orders`);
    if (orderResponse.ok) {
      const orders = await orderResponse.json();
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(
        (order) => order.paymentStatus === "pending"
      ).length;

      document.getElementById("totalOrders").textContent = totalOrders;
      document.getElementById("pendingOrders").textContent = pendingOrders;
    }
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
    // Show default values if API fails
    document.getElementById("totalProducts").textContent = "0";
    document.getElementById("totalOrders").textContent = "0";
    document.getElementById("pendingOrders").textContent = "0";
    document.getElementById("bestsellerCount").textContent = "0";
    document.getElementById("newCount").textContent = "0";
    document.getElementById("catalogueCount").textContent = "0";
  }
}

/**
 * Handle image preview
 */
function handleImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } else {
      preview.innerHTML = "";
    }
  });
}

/**
 * Add new product
 */
async function addProduct(event) {
  event.preventDefault();

  setButtonLoading("addProductBtn", true);

  try {
    const formData = new FormData();
    const name = document.getElementById("productName").value.trim();
    const description = document
      .getElementById("productDescription")
      .value.trim();
    const imageFile = document.getElementById("productImage").files[0];

    // 👇 START: Size price collection (added)
    const prices = {};
    const sizes = ["S", "L", "XL", "XXL", "XXXL"];
    sizes.forEach((size) => {
      const input = document.getElementById(`productPrice_${size}`);
      if (input && input.value.trim()) {
        prices[size] = parseInt(input.value.trim());
      }
    });
    // 👆 END: Size price collection

    const categories = [];
    const catBestseller = document.getElementById("catBestseller");
    const catNew = document.getElementById("catNew");

    if (catBestseller && catBestseller.checked) {
      categories.push("bestseller");
    }
    if (catNew && catNew.checked) {
      categories.push("new");
    }

    if (!name || !description || !imageFile) {
      showMessage(
        "addMessage",
        "Please fill in all required fields and select an image.",
        "error"
      );
      return;
    }

    // 👇 Add prices field to FormData if not empty
    if (Object.keys(prices).length > 0) {
      formData.append("prices", JSON.stringify(prices));
    }
    // 👆

    formData.append("name", name);
    formData.append("description", description);
    formData.append("image", imageFile);
    formData.append("categories", JSON.stringify(categories));

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add product");
    }

    const newProduct = await response.json();

    document.getElementById("addProductForm").reset();
    document.getElementById("imagePreview").innerHTML = "";
    const catCatalogue = document.getElementById("catCatalogue");
    if (catCatalogue) {
      catCatalogue.checked = true;
    }

    showMessage(
      "addMessage",
      `Product "${name}" added successfully!`,
      "success"
    );
    loadDashboardStats();

    console.log("Product added:", newProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    showMessage("addMessage", error.message, "error");
  } finally {
    setButtonLoading("addProductBtn", false);
  }
}

/**
 * Load products
 */
async function loadProducts() {
  const loadingContainer = document.getElementById("productsLoading");
  const productsGrid = document.getElementById("productsGrid");

  loadingContainer.style.display = "block";
  productsGrid.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error("Failed to fetch products");

    const products = await response.json();
    renderProductsGrid(products);
  } catch (error) {
    console.error("Error loading products:", error);
    showMessage(
      "manageMessage",
      "Failed to load products. Please try again.",
      "error"
    );
    productsGrid.innerHTML =
      '<p style="text-align: center; color: #666; grid-column: 1 / -1;">Failed to load products.</p>';
  } finally {
    loadingContainer.style.display = "none";
  }
}

/**
 * Render products grid
 */
function renderProductsGrid(products) {
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML =
      '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No products found.</p>';
    return;
  }

  grid.innerHTML = products
    .map((product) => {
      const price =
        product?.prices?.S || Object.values(product?.prices || {})[0] || null;
      const priceDisplay = price ? formatPrice(price) : "Price Unavailable";

      return `
        <div class="product-card">
            <img src="${product.image}" alt="${
        product.name
      }" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBMMTMwIDEwMEgxMTBWMTMwSDkwVjEwMEg3MEwxMDAgNzBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPg=='">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-categories">
                    ${product.categories
                      .map((cat) => `<span class="category-tag">${cat}</span>`)
                      .join("")}
                </div>
                <div class="product-description">${product.description}</div>
                <div class="product-actions">
                    <button class="btn btn-warning btn-small" onclick="editProduct('${
                      product._id
                    }')">
                        Edit
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteProduct('${
                      product._id
                    }', '${product.name}')">
                        Delete
                    </button>
                </div>
            </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Search products
 */
async function searchProducts() {
  const searchTerm = document.getElementById("searchInput").value.trim();
  const categoryFilter = document.getElementById("categoryFilter").value;

  try {
    let url = `${API_BASE_URL}/products`;

    if (searchTerm) {
      url = `${API_BASE_URL}/products/search/${encodeURIComponent(searchTerm)}`;
    } else if (categoryFilter) {
      url = `${API_BASE_URL}/products/category/${categoryFilter}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to search products");

    const products = await response.json();

    // If both search and category filter are applied, filter client-side
    let filteredProducts = products;
    if (searchTerm && categoryFilter) {
      filteredProducts = products.filter((product) =>
        product.categories.includes(categoryFilter)
      );
    }

    renderProductsGrid(filteredProducts);
  } catch (error) {
    console.error("Error searching products:", error);
    showMessage(
      "manageMessage",
      "Failed to search products. Please try again.",
      "error"
    );
  }
}

/**
 * Clear filters
 */
function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
  loadProducts();
}

/**
 * Edit product
 */
async function editProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) throw new Error("Failed to fetch product");

    const product = await response.json();
    currentEditingId = id;

    // Populate edit form
    document.getElementById("editProductId").value = product._id;
    document.getElementById("editProductName").value = product.name;
    const sizes = ["S", "L", "XL", "XXL", "XXXL"];
    sizes.forEach((size) => {
      const input = document.getElementById(`editProductPrice_${size}`);
      if (input && product.prices && product.prices[size]) {
        input.value = product.prices[size];
      } else if (input) {
        input.value = "";
      }
    });

    document.getElementById("editProductDescription").value =
      product.description;

    // Set categories
    document.getElementById("editCatBestseller").checked =
      product.categories.includes("bestseller");
    document.getElementById("editCatNew").checked =
      product.categories.includes("new");
    document.getElementById("editCatCatalogue").checked = true;

    // Show current image
    document.getElementById("currentImagePreview").innerHTML = `
            <p>Current Image:</p>
            <img src="${product.image}" alt="${product.name}">
        `;

    // Clear new image preview
    document.getElementById("editImagePreview").innerHTML = "";

    // Show modal
    document.getElementById("editModal").style.display = "block";
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("Error loading product for edit:", error);
    showMessage(
      "manageMessage",
      "Failed to load product for editing.",
      "error"
    );
  }
}

/**
 * Close edit modal
 */
function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  document.body.style.overflow = "auto";
  currentEditingId = null;
  document.getElementById("editMessage").innerHTML = "";
  document.getElementById("editImagePreview").innerHTML = "";
  document.getElementById("currentImagePreview").innerHTML = "";
}

/**
 * Update product
 */
async function updateProduct(event) {
  event.preventDefault();

  setButtonLoading("updateProductBtn", true);

  try {
    const formData = new FormData();
    const name = document.getElementById("editProductName").value.trim();
    const prices = {};
    const sizes = ["S", "L", "XL", "XXL", "XXXL"];
    sizes.forEach((size) => {
      const input = document.getElementById(`editProductPrice_${size}`);
      if (input && input.value.trim()) {
        prices[size] = parseInt(input.value.trim());
      }
    });

    const description = document
      .getElementById("editProductDescription")
      .value.trim();
    const imageFile = document.getElementById("editProductImage").files[0];

    // Get selected categories
    const categories = [];
    if (document.getElementById("editCatBestseller").checked) {
      categories.push("bestseller");
    }
    if (document.getElementById("editCatNew").checked) {
      categories.push("new");
    }

    // Validation
    if (!name || !prices || !description) {
      showMessage(
        "editMessage",
        "Please fill in all required fields.",
        "error"
      );
      return;
    }

    // Append form data
    formData.append("name", name);
    if (Object.keys(prices).length > 0) {
      formData.append("prices", JSON.stringify(prices));
    }
    formData.append("description", description);
    formData.append("categories", JSON.stringify(categories));

    // Only append image if a new one is selected
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await fetch(
      `${API_BASE_URL}/products/${currentEditingId}`,
      {
        method: "PUT",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update product");
    }

    const updatedProduct = await response.json();

    closeEditModal();
    loadProducts();
    loadDashboardStats();

    showMessage(
      "manageMessage",
      `Product "${name}" updated successfully!`,
      "success"
    );

    console.log("Product updated:", updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    showMessage("editMessage", error.message, "error");
  } finally {
    setButtonLoading("updateProductBtn", false);
  }
}

/**
 * Delete product
 */
async function deleteProduct(id, name) {
  if (
    !confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete product");
    }

    loadProducts();
    loadDashboardStats();

    showMessage(
      "manageMessage",
      `Product "${name}" deleted successfully!`,
      "success"
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    showMessage("manageMessage", error.message, "error");
  }
}

// ORDER MANAGEMENT FUNCTIONS

/**
 * Load orders
 */
async function loadOrders() {
  const loadingContainer = document.getElementById("ordersLoading");
  const ordersContainer = document.getElementById("ordersContainer");

  loadingContainer.style.display = "block";
  ordersContainer.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE_URL}/orders`);
    if (!response.ok) throw new Error("Failed to fetch orders");

    const orders = await response.json();
    currentOrders = orders;
    renderOrdersGrid(orders);
  } catch (error) {
    console.error("Error loading orders:", error);
    showMessage(
      "ordersMessage",
      "Failed to load orders. Please try again.",
      "error"
    );
    ordersContainer.innerHTML =
      '<p style="text-align: center; color: #666;">Failed to load orders.</p>';
  } finally {
    loadingContainer.style.display = "none";
  }
}

/**
 * Render orders grid
 */
function renderOrdersGrid(orders) {
  const container = document.getElementById("ordersContainer");

  if (orders.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No orders found.</p>';
    return;
  }

  container.innerHTML = orders
    .map(
      (order) => `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">Order #${order._id.slice(-6)}</div>
                <div class="order-customer">${order.customerName}</div>
                <div class="order-date">${formatDate(order.orderDate)}</div>
                <div class="order-status status-${
                  order.paymentStatus
                }">${order.paymentStatus.replace("_", " ")}</div>
            </div>
            <div class="order-body">
                <div class="order-details">
                    <div class="order-info-row">
                        <span class="order-info-label">Phone:</span>
                        <span class="order-info-value">${
                          order.phoneNumber
                        }</span>
                    </div>
                    <div class="order-info-row">
                        <span class="order-info-label">Delivery:</span>
                        <span class="order-info-value">${
                          order.deliveryMethod
                        }</span>
                    </div>
                    <div class="order-info-row">
                        <span class="order-info-label">Items:</span>
                        <span class="order-info-value">${
                          order.items.length
                        } item(s)</span>
                    </div>
                    <div class="order-info-row">
                        <span class="order-info-label">Total:</span>
                        <span class="order-total">${formatPrice(
                          order.total
                        )}</span>
                    </div>
                    ${
                      order.paymentAccountName
                        ? `
                    <div class="order-info-row">
                        <span class="order-info-label">Payment Account:</span>
                        <span class="order-info-value">${order.paymentAccountName}</span>
                    </div>
                    `
                        : ""
                    }
                </div>
                <div class="order-actions">
                    <button class="btn btn-info btn-small" onclick="viewOrderDetails('${
                      order._id
                    }')">
                        View Details
                    </button>
                    ${
                      order.paymentStatus === "payment_made"
                        ? `
                    <button class="btn btn-success btn-small" onclick="confirmPayment('${order._id}')">
                        Confirm Payment
                    </button>
                    `
                        : ""
                    }
                    ${
                      order.paymentStatus === "pending"
                        ? `
                    <button class="btn btn-danger btn-small" onclick="cancelOrder('${order._id}')">
                        Cancel Order
                    </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

/**
 * Search orders
 */
function searchOrders() {
  const searchTerm = document
    .getElementById("orderSearchInput")
    .value.trim()
    .toLowerCase();
  const statusFilter = document.getElementById("orderStatusFilter").value;
  const deliveryFilter = document.getElementById("deliveryMethodFilter").value;

  let filteredOrders = currentOrders;

  // Apply search filter
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(
      (order) =>
        order.customerName.toLowerCase().includes(searchTerm) ||
        order.phoneNumber.includes(searchTerm) ||
        order._id.toLowerCase().includes(searchTerm)
    );
  }

  // Apply status filter
  if (statusFilter) {
    filteredOrders = filteredOrders.filter(
      (order) => order.paymentStatus === statusFilter
    );
  }

  // Apply delivery method filter
  if (deliveryFilter) {
    filteredOrders = filteredOrders.filter(
      (order) => order.deliveryMethod === deliveryFilter
    );
  }

  renderOrdersGrid(filteredOrders);
}

/**
 * Clear order filters
 */
function clearOrderFilters() {
  document.getElementById("orderSearchInput").value = "";
  document.getElementById("orderStatusFilter").value = "";
  document.getElementById("deliveryMethodFilter").value = "";
  renderOrdersGrid(currentOrders);
}

/**
 * View order details
 */
async function viewOrderDetails(orderId) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
    if (!response.ok) throw new Error("Failed to fetch order details");

    const order = await response.json();

    const modalContent = `
        <div class="order-details-full">
          <div class="order-header-full">
            <h4>Order #${order._id.slice(-6)}</h4>
            <div class="order-status status-${
              order.paymentStatus
            }">${order.paymentStatus.replace("_", " ")}</div>
          </div>
          
          <div class="order-info-grid">
            <div class="order-info-section">
              <h5>Customer Information</h5>
              <div class="order-info-row">
                <span class="order-info-label">Name:</span>
                <span class="order-info-value">${order.customerName}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Phone:</span>
                <span class="order-info-value">${order.phoneNumber}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Delivery:</span>
                <span class="order-info-value">${order.deliveryMethod}</span>
              </div>
            </div>
            
            <div class="order-info-section">
              <h5>Order Information</h5>
              <div class="order-info-row">
                <span class="order-info-label">Order Date:</span>
                <span class="order-info-value">${formatDate(
                  order.orderDate
                )}</span>
              </div>
              <div class="order-info-row">
                <span class="order-info-label">Total Amount:</span>
                <span class="order-total">${formatPrice(order.total)}</span>
              </div>
              ${
                order.paymentAccountName
                  ? `
              <div class="order-info-row">
                <span class="order-info-label">Payment Account:</span>
                <span class="order-info-value">${order.paymentAccountName}</span>
              </div>
              `
                  : ""
              }
              ${
                order.paymentConfirmedAt
                  ? `
              <div class="order-info-row">
                <span class="order-info-label">Payment Confirmed:</span>
                <span class="order-info-value">${formatDate(
                  order.paymentConfirmedAt
                )}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <div class="order-items-section">
            <h5>Order Items</h5>
            <div class="order-items-list">
              ${order.items
                .map(
                  (item) => `
                <div class="order-item-detail">
                  <div class="order-item-info">
                    <h6>${item.name}</h6>
                    <div class="order-item-specs">
                      Size: ${item.size} | Color: ${item.color} | Quantity: ${
                    item.quantity
                  }
                    </div>
                    ${
                      item.customMessage
                        ? `
                    <div class="order-item-custom">
                      <strong>Custom Message:</strong> ${item.customMessage}
                    </div>
                    `
                        : ""
                    }
                  </div>
                  <div class="order-item-price-detail">
                    ${formatPrice(item.price)} × ${
                    item.quantity
                  } = ${formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
            <div class="order-total-section">
              <strong>Total: ${formatPrice(order.total)}</strong>
            </div>
          </div>
          
          <div class="order-actions-section">
            ${
              order.paymentStatus === "payment_made"
                ? `
              <button class="btn btn-success" onclick="confirmPayment('${order._id}'); closeOrderModal();">
                Confirm Payment
              </button>
            `
                : ""
            }
            ${
              order.paymentStatus === "pending"
                ? `
              <button class="btn btn-danger" onclick="cancelOrder('${order._id}'); closeOrderModal();">
                Cancel Order
              </button>
            `
                : ""
            }
            <button class="btn btn-primary" onclick="closeOrderModal()">
              Close
            </button>
          </div>
        </div>
      `;

    // Corrected ID here
    document.querySelector(".view-all-modal").innerHTML = modalContent;
    // Corrected ID here
    document.querySelector(".view-all-modal").style.display = "block";
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error("Error loading order details:", error);
    showMessage("ordersMessage", "Failed to load order details.", "error");
  }
}

/**
 * Close order modal
 */
function closeOrderModal() {
  document.querySelector(".view-all-modal").style.display = "none";
  document.body.style.overflow = "auto";
}

/**
 * Confirm payment for an order
 */
async function confirmPayment(orderId) {
  if (
    !confirm(
      "Are you sure you want to confirm this payment? This action will mark the order as confirmed."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentStatus: "confirmed",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to confirm payment");
    }

    loadOrders();
    loadDashboardStats();
    showMessage("ordersMessage", "Payment confirmed successfully!", "success");
  } catch (error) {
    console.error("Error confirming payment:", error);
    showMessage("ordersMessage", error.message, "error");
  }
}

/**
 * Cancel an order
 */
async function cancelOrder(orderId) {
  if (
    !confirm(
      "Are you sure you want to cancel this order? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentStatus: "cancelled",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to cancel order");
    }

    loadOrders();
    loadDashboardStats();
    showMessage("ordersMessage", "Order cancelled successfully!", "success");
  } catch (error) {
    console.error("Error cancelling order:", error);
    showMessage("ordersMessage", error.message, "error");
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize dashboard stats
  loadDashboardStats();

  // Add product form
  document
    .getElementById("addProductForm")
    .addEventListener("submit", addProduct);

  // Edit product form
  document
    .getElementById("editProductForm")
    .addEventListener("submit", updateProduct);

  // Search and filter for products
  document
    .getElementById("searchInput")
    .addEventListener("input", searchProducts);
  document
    .getElementById("categoryFilter")
    .addEventListener("change", searchProducts);

  // Search and filter for orders
  document
    .getElementById("orderSearchInput")
    .addEventListener("input", searchOrders);
  document
    .getElementById("orderStatusFilter")
    .addEventListener("change", searchOrders);
  document
    .getElementById("deliveryMethodFilter")
    .addEventListener("change", searchOrders);

  // Image preview handlers
  handleImagePreview("productImage", "imagePreview");
  handleImagePreview("editProductImage", "editImagePreview");

  // Close modals when clicking outside
  document.getElementById("editModal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeEditModal();
    }
  });

  //   document.getElementById("orderModal").addEventListener("click", function (e) {
  //     if (e.target === this) {
  //       closeOrderModal();
  //     }
  //   });

  // Close modals with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.getElementById("editModal").style.display === "block") {
        closeEditModal();
      }
      if (document.getElementById("orderModal").style.display === "block") {
        closeOrderModal();
      }
    }
  });

  console.log("CMS Admin Panel with Order Management initialized");
});

// Make functions globally available for onclick handlers
window.switchTab = switchTab;
window.clearFilters = clearFilters;
window.clearOrderFilters = clearOrderFilters;
window.editProduct = editProduct;
window.closeEditModal = closeEditModal;
window.deleteProduct = deleteProduct;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
window.confirmPayment = confirmPayment;
window.cancelOrder = cancelOrder;
