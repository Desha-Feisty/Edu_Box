import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUIStore = create(
    persist(
        (set) => ({
            // Modal state
            activeModal: null,
            modalData: null,
            openModal: (modalId, data = null) => set({ activeModal: modalId, modalData: data }),
            closeModal: () => set({ activeModal: null, modalData: null }),

            // Sidebar state
            isSidebarOpen: true,
            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
            isSidebarPinned: false,
            toggleSidebarPin: () => set((state) => ({ isSidebarPinned: !state.isSidebarPinned })),
            setSidebarPinned: (pinned) => set({ isSidebarPinned: pinned }),

            // Loading states
            globalLoading: false,
            setGlobalLoading: (loading) => set({ globalLoading: loading }),

            // Toast queue for multiple toasts
            toasts: [],
            addToast: (toast) => set((state) => ({
                toasts: [...state.toasts, { id: Date.now(), ...toast }]
            })),
            removeToast: (id) => set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            })),

            // Search state
            searchQuery: "",
            setSearchQuery: (query) => set({ searchQuery: query }),
            clearSearch: () => set({ searchQuery: "" }),

            // Selected items
            selectedItems: [],
            setSelectedItems: (items) => set({ selectedItems: items }),
            toggleSelectedItem: (id) => set((state) => ({
                selectedItems: state.selectedItems.includes(id)
                    ? state.selectedItems.filter((i) => i !== id)
                    : [...state.selectedItems, id]
            })),
            clearSelectedItems: () => set({ selectedItems: [] }),
        }),
        {
            name: "ui-storage",
            partialize: (state) => ({
                isSidebarOpen: state.isSidebarOpen,
                isSidebarPinned: state.isSidebarPinned,
            }),
        },
    ),
);

export default useUIStore;