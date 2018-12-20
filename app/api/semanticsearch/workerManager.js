import EventEmitter from 'events';
import Worker from './worker';
import { IN_PROGRESS, PENDING } from './semanticSearch';
import searchModel from './model';

const NUM_WORKERS = 3;

class WorkerManager extends EventEmitter {
  constructor() {
    super();
    this.workers = {};
  }
  get currentWorkersCount() {
    return Object.keys(this.workers).length;
  }
  get canAddWorker() {
    return this.currentWorkersCount < NUM_WORKERS;
  }
  async start() {
    let searchesToStart = await searchModel.get(
      { status: IN_PROGRESS }, '', { limit: NUM_WORKERS });
    const remainingSlots = NUM_WORKERS - searchesToStart.length;
    if (remainingSlots > 0) {
      const pendingSearches = await searchModel.get(
        { status: PENDING }, '', { limit: remainingSlots });
      searchesToStart = [...searchesToStart, ...pendingSearches];
    }
    searchesToStart.forEach(newSearch => this.notifyNewSearch(newSearch._id));
  }
  notifyNewSearch(searchId) {
    if (this.canAddWorker) {
      const worker = new Worker(searchId);
      worker.on('done', () => this.onWorkerDone(searchId));
      worker.on('update', update => this.onWorkerUpdate(searchId, update));
      worker.on('error', error => this.onWorkerError(searchId, error));
      this.workers[searchId] = worker;
      worker.start();
    }
  }
  async onWorkerDone(searchId) {
    this.emit('searchDone', searchId);
    this.deleteAndReplaceWorker(searchId);
  }
  async onWorkerError(searchId, error) {
    this.emit('searchError', searchId, error);
    this.deleteAndReplaceWorker(searchId);
  }
  onWorkerUpdate(searchId, update) {
    this.emit('searchUpdated', searchId, update);
  }
  deleteAndReplaceWorker(searchId) {
    delete this.workers[searchId];
    this.startNewSearchIfFree();
  }
  async startNewSearchIfFree() {
    if (this.canAddWorker) {
      const currentSearches = Object.keys(this.workers);
      let [newSearch] = await searchModel.get({ status: IN_PROGRESS, _id: { $nin: currentSearches } }, '', { limit: 1 });
      if (!newSearch) {
        [newSearch] = await searchModel.get({ status: PENDING }, '', { limit: 1 });
      }
      if (newSearch) {
        this.notifyNewSearch(newSearch._id);
      }
    }
  }
}

const workerManager = new WorkerManager();

export default workerManager;

