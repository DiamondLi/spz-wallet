layui.use(['table','form', 'layedit', 'laydate', 'upload','element'], function(){
    var $ = layui.jquery,
        table = layui.table,
        form = layui.form,
        laydate = layui.laydate,
        layedit = layui.layedit,
        element = layui.element,
        layer = layui.layer;


    //执行一个 table 实例
    var tableIns = table.render({
        elem: '#table'
		,data:data
        ,method:'POST'
        ,url: '/order/getMemberOrders' //数据接口
        ,page: true //开启分页
        ,skin: 'line' //行边框风格
        ,cols: [[ //表头
            {title: '币种', templet:'<div>{{ d.orderVO.orderNo }}</div>'}
            ,{title: '流水号', width:'15%', templet:'<div>{{ d.orderVO.coinName }}</div>'}
            ,{title: '数量', templet:'<div>{{ d.orderVO.typeName }}</div>'}
            ,{title: '转出地址', width:'15%', templet:'<div>{{ d.orderVO.price }}</div>'}
            ,{title: '转入地址', width:'15%', templet:'<div>{{ d.orderVO.num }}</div>'}
            ,{title: '状态', templet:'<div>{{ d.orderVO.money }}</div>'}
            ,{title: '交易哈希', templet:'<div>{{ d.orderVO.statusName }}</div>'}
            ,{title: '旷工费', templet:'<div>{{ d.orderVO.createTime }}</div>'}
        ]]
    });

    $(document).on('click','#search',function(){
        var coinId = $('#coinId option:selected').val();
        var type = $('#tradeTypeId option:selected').val();
        var status = $('#statusId option:selected').val();
        var startTime = $("input[name='startTime']").val();
        var endTime = $("input[name='endTime']").val();
        var where = "{startTime:'" + startTime + "',endTime:'" + endTime + "',coinId:'" + coinId + "',type:'" + type + "',status:'" + status + "'}";
        tableIns.reload({
            where: eval("(" + where + ")")
        });
    });

});

