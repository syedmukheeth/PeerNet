'use strict';

/**
 * Calculates a ranking score for a post based on engagement and recency.
 * Formula: (Votes - 1) / (Age + 2)^Gravity
 * We use: (Likes + Comments * 2 + 1) / (HoursOld + 2)^1.5
 */
const calculateScore = (likes = 0, comments = 0, createdAt) => {
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const gravity = 1.5;
    const engagement = likes + (comments * 2) + 1;
    return engagement / Math.pow(hoursOld + 2, gravity);
};

/**
 * Simple Min-Heap implementation to keep track of top K items efficiently.
 * Time Complexity: O(N log K) to find top K from N items.
 */
class MinHeap {
    constructor(maxSize, comparator = (a, b) => a.score - b.score) {
        this.heap = [];
        this.maxSize = maxSize;
        this.comparator = comparator;
    }

    push(item) {
        if (this.heap.length < this.maxSize) {
            this.heap.push(item);
            this._bubbleUp();
        } else if (this.comparator(item, this.heap[0]) > 0) {
            this.heap[0] = item;
            this._bubbleDown();
        }
    }

    _bubbleUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            if (this.comparator(this.heap[index], this.heap[parentIndex]) < 0) {
                [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
                index = parentIndex;
            } else break;
        }
    }

    _bubbleDown() {
        let index = 0;
        const length = this.heap.length;
        while (true) {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let smallest = index;

            if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) smallest = left;
            if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) smallest = right;

            if (smallest !== index) {
                [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                index = smallest;
            } else break;
        }
    }

    toArray() {
        return [...this.heap].sort((a, b) => this.comparator(b, a));
    }
}

module.exports = { calculateScore, MinHeap };
