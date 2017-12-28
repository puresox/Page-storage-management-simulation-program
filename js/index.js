$("#start").on("click", async function() {
  // 获取输入
  const pageList = $("#pageList")
    .val()
    .split(" ");
  const memoryVolume = $("#memoryVolume").val();
  const pageAmount = $("#pageAmount").val();
  const TLBAmount = $("#TLBAmount").val();
  const memoryTime = $("#memoryTime").val();
  const TLBTime = $("#TLBTime").val();
  const interruptTime = $("#interruptTime").val();
  const hasTLB = $("input:radio:checked").val() === "y" ? true : false;
  // 初始化各表
  let pageTable = Array(pageAmount).fill({
    status: 0,
    visit: 0
  });
  let memory = [];
  let TLB = [];
  let time = 0;
  // 进行运算
  pageList.forEach(async page => {
    ({ pageTable, TLB, memory, time } = await FIFO({
      pageTable,
      TLB,
      memory,
      memoryVolume,
      pageAmount,
      TLBAmount,
      page,
      time,
      interruptTime,
      memoryTime,
      TLBTime,
      hasTLB
    }));
    console.log(memory);
  });
});

$(async () => {});
