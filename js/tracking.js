const chatMessages = document.getElementById("chatMessages");
const orderIdInput = document.getElementById("orderIdInput");
const trackOrderButton = document.getElementById("trackOrderButton");
const loadingIndicator = document.getElementById("loadingIndicator");

const API_BASE_URL = "https://ifemade-server.onrender.com/api";

// Function to format date from an ISO string
function formatDate(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return "N/A";
  }
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error("Parsed invalid date from string:", dateString);
      return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    console.error("Error formatting date string:", dateString, e);
    return "Error in Date";
  }
}

// Function to format price from a number
function formatPrice(priceValue, currency = "N") {
  if (typeof priceValue !== "number" || isNaN(priceValue)) {
    // Attempt to parse if it's a string number, though API should send number
    const parsedVal = parseFloat(priceValue);
    if (isNaN(parsedVal)) {
      return currency + "0 (Invalid)";
    }
    priceValue = parsedVal;
  }
  return currency + priceValue.toLocaleString();
}

// Function to add a message to the chat
function addMessage(content, isUser = false, isHtml = false) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("flex", isUser ? "justify-end" : "justify-start");

  const bubbleDiv = document.createElement("div");
  bubbleDiv.classList.add(
    "p-3",
    "message-bubble",
    isUser ? "user-bubble" : "bot-bubble"
  );

  if (isHtml) {
    bubbleDiv.innerHTML = content;
  } else {
    bubbleDiv.textContent = content;
  }

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
}

// Function to display order details
function displayOrderDetails(order) {
  // Corrected: Access _id directly as it's a string
  addMessage(
    `Okay, I found your order: <strong>#${
      order._id ? order._id.slice(-8) : "N/A"
    }</strong>! Here are the details:`,
    false,
    true
  );

  let summary = `<p class="text-sm"><strong>Customer:</strong> ${
    order.customerName || "N/A"
  }</p>`;
  summary += `<p class="text-sm"><strong>Phone:</strong> ${
    order.phoneNumber || "N/A"
  }</p>`;
  summary += `<p class="text-sm"><strong>Delivery Method:</strong> ${
    order.deliveryMethod || "N/A"
  }</p>`;
  // Corrected: Pass order.total (number) directly to formatPrice
  summary += `<p class="text-sm"><strong>Total Amount:</strong> ${formatPrice(
    order.total
  )}</p>`;

  // Display current status (new field with fallback to old field)
  const currentStatus = order.status || order.paymentStatus || "pending";
  const statusDisplay = currentStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  summary += `<p class="text-sm"><strong>Current Status:</strong> <span class="status-badge status-${currentStatus}">${statusDisplay}</span></p>`;
  // Corrected: Pass order.orderDate (ISO string) directly to formatDate
  summary += `<p class="text-sm"><strong>Order Date:</strong> ${formatDate(
    order.orderDate
  )}</p>`;
  addMessage(summary, false, true);

  if (order.items && order.items.length > 0) {
    addMessage("Here are the items in your order:", false);
    order.items.forEach((item) => {
      const quantityDisplay =
        typeof item.quantity === "number" ? item.quantity : "N/A";
      let itemHtml = `
                <div class="item-card p-3 my-2">
                    <div class="flex items-start space-x-3">
                        <img src="${
                          item.image ||
                          "https://placehold.co/80x80/374151/FFF?text=Item"
                        }" alt="${
        item.name || "Item"
      }" class="w-20 h-20 object-cover rounded-md border border-gray-500" onerror="this.onerror=null;this.src='https://placehold.co/80x80/374151/FFF?text=Error';">
                        <div class="flex-1">
                            <p class="font-semibold text-base">${
                              item.name || "Unnamed Item"
                            }</p>
                            <p class="text-xs text-gray-300">Price: ${formatPrice(
                              item.price
                            )}</p>
                            <p class="text-xs text-gray-300">Quantity: ${quantityDisplay}</p>
                            ${
                              item.size
                                ? `<p class="text-xs text-gray-300">Size: ${item.size}</p>`
                                : ""
                            }
                            ${
                              item.color
                                ? `<p class="text-xs text-gray-300">Color: ${item.color}</p>`
                                : ""
                            }
                        </div>
                    </div>
                    ${
                      item.customMessage
                        ? `<p class="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-500"><em>Custom Message: ${item.customMessage}</em></p>`
                        : ""
                    }
                </div>
            `;
      addMessage(itemHtml, false, true);
    });
  } else {
    addMessage("There are no items in this order.", false);
  }

  // Display status timeline if available
  displayStatusTimeline(order);
}

function displayStatusTimeline(order) {
  const currentStatus = order.status || order.paymentStatus || "pending";
  const statusHistory = order.statusHistory || [];

  const statusSteps = [
    {
      key: "pending",
      label: "Order Placed",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    },
    {
      key: "payment_confirmed",
      label: "Payment Confirmed",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>',
    },
    {
      key: "in_production",
      label: "In Production",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    },
    {
      key: "ready",
      label: "Ready",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    },
    {
      key: "shipped",
      label: "Shipped",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    },
  ];

  let timelineHtml = '<div class="status-timeline">';

  statusSteps.forEach((step, index) => {
    const isCompleted = getStatusOrder(currentStatus) >= index;
    const isCurrent = currentStatus === step.key;
    const historyEntry = statusHistory.find((h) => h.status === step.key);

    timelineHtml += `
      <div class="timeline-step ${isCompleted ? "completed" : ""} ${
      isCurrent ? "current" : ""
    }">
        <div class="timeline-icon">${step.icon}</div>
        <div class="timeline-content">
          <div class="timeline-title">${step.label}</div>
          ${
            historyEntry
              ? `<div class="timeline-date">${formatDate(
                  historyEntry.timestamp
                )}</div>`
              : ""
          }
          ${
            historyEntry && historyEntry.adminNote
              ? `<div class="timeline-note">${historyEntry.adminNote}</div>`
              : ""
          }
        </div>
      </div>
    `;
  });

  timelineHtml += "</div>";

  addMessage("Order Progress:", false);
  addMessage(timelineHtml, false, true);
}

function getStatusOrder(status) {
  const statusOrder = {
    pending: 0,
    payment_confirmed: 1,
    in_production: 2,
    ready: 3,
    shipped: 4,
    delivered: 5,
  };
  return statusOrder[status] || 0;

  trackOrderButton.addEventListener("click", async () => {
    const orderId = orderIdInput.value.trim();
    if (!orderId) {
      addMessage("Please enter an Order ID.", false);
      return;
    }

    addMessage(`Looking for order: #${orderId}`, true);
    orderIdInput.value = ""; // Clear input
    loadingIndicator.classList.remove("hidden"); // Show loader
    trackOrderButton.disabled = true;
    trackOrderButton.classList.add("opacity-50", "cursor-not-allowed");

    try {
      // IMPORTANT: Replace '/api/orders/' with your actual API base URL if it's different
      // For example, if your backend is on http://localhost:3000, use:
      // const response = await fetch(`http://localhost:3000/api/orders/${orderId}`);
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to parse error response" }));
        if (response.status === 404) {
          addMessage(
            `Sorry, I couldn't find an order with ID <strong>#${orderId}</strong>. Please check the ID and try again.`,
            false,
            true
          );
        } else {
          addMessage(
            `Server error (${response.status}): ${
              errorData.error || errorData.message || "Unknown error"
            }`,
            false,
            true
          );
        }
      } else {
        const order = await response.json();
        if (order && order._id) {
          // Check if order and order._id exist
          displayOrderDetails(order);
        } else {
          addMessage(
            `Received an unexpected response structure for order ID <strong>#${orderId}</strong>. The order data or ID is missing.`,
            false,
            true
          );
          console.error("Unexpected order structure:", order);
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      addMessage(
        `Oops! Something went wrong while fetching order <strong>#${orderId}</strong>. Please try again later. (Error: ${error.message})`,
        false,
        true
      );
    } finally {
      loadingIndicator.classList.add("hidden"); // Hide loader
      trackOrderButton.disabled = false;
      trackOrderButton.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });

  // Allow pressing Enter to submit
  orderIdInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default form submission if it were in a form
      trackOrderButton.click();
    }
  });
}
