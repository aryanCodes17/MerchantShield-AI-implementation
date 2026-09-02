# Dataset

Place the ULB Credit Card Fraud Detection CSV at:

`data/raw/creditcard.csv`

Source: [Credit Card Fraud Detection (Kaggle / MLG ULB)](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

The file is not committed (it is large). Download it with:

```bash
python scripts/download_data.py
```

The download script tries, in order:

1. A public GitHub CSV mirror of the same dataset
2. OpenML dataset 1597
3. The Kaggle CLI (`kaggle datasets download -d mlg-ulb/creditcardfraud`) if configured
