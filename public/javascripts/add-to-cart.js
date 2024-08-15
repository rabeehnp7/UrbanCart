function addToCart(proId){
    $.ajax({
        url:"/add-to-cart/"+proId,
        method:"get",
        success:(response)=>{
            if(response.status){
                let cartCount=$('#cart-count').html()
                cartCount=parseInt(cartCount)+1
                $('#cart-count').html(cartCount)
            }
        }
    })
}
function updateCount(cartId,proId,count,price){
    let quantity=document.getElementById('quant'+proId).innerHTML
    if(quantity==1 && count==-1){
       const button= document.getElementById('decrement'+proId)
       button.disabled=true
    }else{
        const button= document.getElementById('decrement'+proId)
       button.disabled=false
        $.ajax({
            url:'/update-quantity',
            method:'post',
            data:{
              cart:cartId,
              product:proId,
              count:count,
            },
            success:function(response){
              let quantity=$("#quant"+proId).html()
              quantity=parseInt(quantity)+count
              $("#quant"+proId).html(quantity)
              $('#proTotal'+proId).html(quantity*price)
              let grandTotal=$('#grandTotal').html()
              grandTotal=parseInt(grandTotal)
              let price1=parseInt(price)
              if(count==1){
                $('#grandTotal').html(grandTotal+price1)
              }else if(count==-1){
                $('#grandTotal').html(grandTotal-price1)
              }
              if(quantity===1){
                const button= document.getElementById('decrement'+proId)
                button.disabled=true
              }
            }
          })
    }
  }
  function deleteItem(cartId,proId){
    $.ajax({
        url:'/delete-item',
        method:'post',
        data:{
            cartId:cartId,
            proId:proId
        },
        success:function(response){
            if(response.status){
              alert("Product removed from cart")
                // $('#item'+proId).remove()
                location.reload()
                let proTotal=$('#proTotal'+proId).html()
                proTotal=parseInt(proTotal)
                let total=$('#grandTotal').html()
                total=parseInt(total)
                $('#grandTotal').html(total-proTotal)
            }
        }
    })
  }