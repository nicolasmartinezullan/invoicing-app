<template>
  <div>
    <div class="container">
      <div class="tab-pane fade show active">
        <div class="row">
          <div class="col-md-12">
            <h3>Enter Details below to Create Invoice</h3>
            <form @submit.prevent="onSubmit">
              <div class="form-group">
                <label for="invoice_name">Invoice Name:</label>
                <input type="text" required class="form-control" placeholder="eg Seller's Invoice" v-model="invoice.name">
              </div>
              <div class="form-group">
                <label for="invoice_price">Invoice Price:</label>
                <span> $ {{ invoice.total_price }}</span>
              </div>

              <hr />
              <h3>Transactions</h3>
              <div class="form-group">
                <label for="">Add Transaction:</label>
                <button class="btn btn-primary" type="button" data-toggle="modal" data-target="#transactionModal">+</button>
                <!-- Modal -->
                <div class="modal fade" id="transactionModal" tabindex="-1" role="dialog" aria-labelledby="transactionModalLabel" aria-hidden="true">
                  <div class="modal-dialog" role="document">
                    <div class="modal-content">
                      <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLabel">Add Transaction</h5>
                        <button class="close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div>
                      <div class="modal-body">
                        <div class="form-group">
                          <label for="transaction_name">Transaction name</label>
                          <input type="text" id="txn_name_modal" class="form-control">
                        </div>
                        <div class="form-group">
                          <label for="price">Price ($)</label>
                          <input type="number" id="txn_price_modal" class="form-control">
                        </div>
                      </div>
                      <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" aria-dismiss="modal">Discard Transaction</button>
                        <button type="button" class="btn btn-primary" data-dismiss="modal" v-on:click="saveTransaction()">Save Transaction</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-12">
                <table class="table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Transaction Name</th>
                      <th scope="col">Price ($)</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="txn in transactions">
                      <tr :key="txn.id">
                        <td>{{ txn.id }}</td>
                        <td>{{ txn.name }}</td>
                        <td>{{ txn.price }}</td>
                        <td><button type="button" v-on:click="deleteTransaction(txn.id)" class="btn btn-danger">&times;</button></td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
              <div class="form-group">
                <button class="btn btn-primary">Create Invoice</button>
                {{ loading }}
                {{ status }}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'CreateInvoice',
  data() {
    return {
      invoice: {
        name: '',
        total_price: 0,
      },
      transactions: [],
      nextTxnId: 1,
      loading: '',
      status: '',
    };
  },
  methods: {
    saveTransaction() {
      // append data to the arrays
      const name = document.getElementById('txn_name_modal').value;
      const price = document.getElementById('txn_price_modal').value;
      if (name.length !== 0 && price > 0) {
        this.transactions.push({
          id: this.nextTxnId,
          name,
          price,
        });
        this.nextTxnId = this.nextTxnId + 1;
        this.calcTotal();
        // clear their values
        document.getElementById('txn_name_modal').value = '';
        document.getElementById('txn_price_modal').value = '';
      }
    },
    deleteTransaction(id) {
      const newList = this.transactions.filter(el => el.id !== id);
      // this.nextTxnId--
      this.transactions = newList;
      this.calcTotal();
    },
    calcTotal() {
      this.invoice.total_price = this.transactions.reduce((total, el) => total + parseInt(el.price, 10), 0);
    },
    onSubmit() {
      const formData = new FormData();
      // format for request
      const txnNames = [];
      const txnPrices = [];
      this.transactions.forEach((el) => {
        txnNames.push(el.name);
        txnPrices.push(el.price);
      });
      const user = JSON.parse(localStorage.getItem('user'));
      formData.append('name', this.invoice.name);
      formData.append('txn_names', txnNames);
      formData.append('txn_prices', txnPrices);
      formData.append('user_id', user.id);
      this.loading = 'Creating Invoice, please wait ...';
      // Post to server
      axios.post('http://localhost:3128/invoice', formData).then((res) => {
        // Post a status message
        this.loading = '';
        this.status = res.data.message;
      });
    },
  },
};
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #426cb9;
}

.tab-pane {
  margin-top: 20px;
}
</style>
