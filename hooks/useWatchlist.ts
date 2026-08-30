"use client";

import { useState, useMemo, useCallback } from "react";
import type { WatchlistItem } from "@/lib/firebase";

export function useWatchlist(initialItems: WatchlistItem[] = []) {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = mediaTypeFilter === "all" || item.type === mediaTypeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch =
        !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [items, mediaTypeFilter, statusFilter, searchQuery]);

  const updateItemLocally = useCallback((id: string, updates: Partial<WatchlistItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item))
    );
  }, []);

  const addItemLocally = useCallback((newItem: WatchlistItem) => {
    setItems((prev) => [newItem, ...prev]);
  }, []);

  const removeItemLocally = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    setItems,
    filteredItems,
    mediaTypeFilter,
    setMediaTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    updateItemLocally,
    addItemLocally,
    removeItemLocally,
  };
}
