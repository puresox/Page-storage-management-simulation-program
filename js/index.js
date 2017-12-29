const db = new Dexie("db");
db.version(1).stores({
  statistics: "++id,page,FIFO,LFU,LRU,OPT"
});

let algorithmResult = {
  page: {},
  FIFO: {
    time: 0,
    lostPageTimes: 0
  },
  LFU: {
    time: 0,
    lostPageTimes: 0
  },
  LRU: {
    time: 0,
    lostPageTimes: 0
  },
  OPT: {
    time: 0,
    lostPageTimes: 0
  }
};

function getAppendString(page, memory, time) {
  appendString = `<tr><th scope="row">${page}</th>`;
  memory.forEach(element => {
    if (element === page) {
      appendString += `<td style="color: red;">${element}</td>`;
    } else if (element === -1) {
      appendString += `<td style="opacity:0.0;">${element}</td>`;
    } else {
      appendString += `<td>${element}</td>`;
    }
  });
  appendString += `<th scope="row">${time}毫秒</th></tr>`;
  return appendString;
}

/** 点击开始按钮 */
$("#start").on("click", async function() {
  // 获取输入
  /** 页面访问序列 */
  const pageList =
    $("#pageList").val() === ""
      ? [1, 2, 3, 4, 5, 6, 4, 3, 2, 1, 6]
      : $("#pageList")
          .val()
          .split(" ")
          .map(page => {
            return parseInt(page);
          });
  /** 内存容量 */
  const memoryVolume = parseInt($("#memoryVolume").val()) || 4;
  /** 页面总数 */
  const pageAmount = parseInt($("#pageAmount").val()) || 10;
  /** 快表容量 */
  const TLBAmount = parseInt($("#TLBAmount").val()) || 2;
  /** 内存存取的时间 */
  const memoryTime = parseInt($("#memoryTime").val()) || 200;
  /** 快表存取的时间 */
  const TLBTime = parseInt($("#TLBTime").val()) || 100;
  /** 缺页中断时间 */
  const interruptTime = parseInt($("#interruptTime").val()) || 300;
  /** 是否有快表 */
  const hasTLB =
    ($("input:radio:checked").val() === "y" ? true : false) || false;
  // 验证
  pageList.forEach(page => {
    if (page > pageAmount) {
      alert("越界中断");
      return;
    }
  });
  // 初始化模拟项
  let pageTable = [];
  for (let index = 0; index < pageAmount; index++) {
    pageTable.push({
      status: 0,
      visit: 0
    });
  }
  let memory = [];
  for (let index = 0; index < memoryVolume; index++) {
    memory.push(-1);
  }
  let TLB = [];
  for (let index = 0; index < TLBAmount; index++) {
    TLB.push({ page: -1, visit: 0 });
  }
  let time = 0;
  let lostPageTimes = 0;
  // 初始化worker
  const FIFOWorker = new Worker("./js/algorithm/FIFO.js");
  const LFUWorker = new Worker("./js/algorithm/LFU.js");
  const LRUWorker = new Worker("./js/algorithm/LRU.js");
  const OPTWorker = new Worker("./js/algorithm/OPT.js");
  // 通知worker开始模拟
  const messageToDedicatedWorker = {
    pageTable,
    TLB,
    memory,
    memoryVolume,
    pageAmount,
    TLBAmount,
    pageList,
    time,
    interruptTime,
    memoryTime,
    TLBTime,
    hasTLB,
    lostPageTimes
  };
  algorithmResult.page = {
    memoryVolume,
    pageAmount,
    TLBAmount,
    pageList,
    interruptTime,
    memoryTime,
    TLBTime,
    hasTLB
  };
  FIFOWorker.postMessage(messageToDedicatedWorker);
  LFUWorker.postMessage(messageToDedicatedWorker);
  LRUWorker.postMessage(messageToDedicatedWorker);
  OPTWorker.postMessage(messageToDedicatedWorker);
  // 响应来自worker的消息
  FIFOWorker.onmessage = function({ data: { success, workerResult } }) {
    if (!success) {
      alert(workerResult);
      return;
    }
    const { pageTable, page, TLB, memory, time, lostPageTimes } = workerResult;
    $("#FIFOTable tbody").prepend(getAppendString(page, memory, time));
    algorithmResult.FIFO.time = time;
    algorithmResult.FIFO.lostPageTimes = lostPageTimes;
  };
  LFUWorker.onmessage = function({ data: { success, workerResult } }) {
    if (!success) {
      alert(workerResult);
      return;
    }
    const { pageTable, page, TLB, memory, time, lostPageTimes } = workerResult;
    $("#LFUTable tbody").prepend(getAppendString(page, memory, time));
    algorithmResult.LFU.time = time;
    algorithmResult.LFU.lostPageTimes = lostPageTimes;
  };
  LRUWorker.onmessage = function({ data: { success, workerResult } }) {
    if (!success) {
      alert(workerResult);
      return;
    }
    const { pageTable, page, TLB, memory, time, lostPageTimes } = workerResult;
    $("#LRUTable tbody").prepend(getAppendString(page, memory, time));
    algorithmResult.LRU.time = time;
    algorithmResult.LRU.lostPageTimes = lostPageTimes;
  };
  OPTWorker.onmessage = function({ data: { success, workerResult } }) {
    if (!success) {
      alert(workerResult);
      return;
    }
    const { pageTable, page, TLB, memory, time, lostPageTimes } = workerResult;
    $("#OPTTable tbody").prepend(getAppendString(page, memory, time));
    algorithmResult.OPT.time = time;
    algorithmResult.OPT.lostPageTimes = lostPageTimes;
  };
});

/** 点击随机按钮 */
$("#randomPageList").on("click", function() {
  const pageListAmount = prompt("请输入序列长度：");
  /** 页面总数 */
  const pageAmount = parseInt($("#pageAmount").val()) || 10;
  const pageList = [];
  for (let index = 0; index < pageListAmount; index++) {
    pageList.push(Math.floor(Math.random() * pageAmount));
  }
  $("#pageList").val(pageList.join(" "));
});

/** 点击统计按钮 */
$("#statistics").on("click", function() {
  window.open("statistics.html");
});

/** 点击保存按钮 */
$("#save").on("click", async function() {
  await db.statistics
    .put(algorithmResult)
    .then(function() {
      alert("保存成功！");
    })
    .catch(function(error) {
      alert("保存失败: " + error);
    });
});
