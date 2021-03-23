import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";
import { current, produce } from "immer";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let retrivedProduct = await api
        .get(`products/${productId}`)
        .then((response) => {
          return response.data as Product;
        });

      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      const productStockLimit = await api
        .get(`stock/${productId}`)
        .then((response) => {
          const data = response.data as Stock;
          return data.amount;
        });

      if (retrivedProduct) {
        if (productCartIndex === -1) {
          setCart(
            produce(cart, (draft) => {
              if (productStockLimit >= 1) {
                draft.push({ ...retrivedProduct, amount: 1 });
                localStorage.setItem(
                  "@RocketShoes:cart",
                  JSON.stringify(current(draft))
                );
              } else {
                toast.error("Quantidade solicitada fora de estoque");
              }
            })
          );
        } else {
          setCart(
            produce(cart, (draft) => {
              if (productStockLimit > draft[productCartIndex].amount) {
                draft[productCartIndex].amount += 1;
                localStorage.setItem(
                  "@RocketShoes:cart",
                  JSON.stringify(current(draft))
                );
              } else {
                toast.error("Quantidade solicitada fora de estoque");
              }
            })
          );
        }
      }
    } catch {
      toast.error("Quantidade solicitada fora de estoque");
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    setCart(
      produce(cart, (draft) => {
        let index = cart.findIndex((product) => product.id === productId);

        if (index !== -1) {
          draft.splice(index, 1);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(current(draft))
          );
        } else {
          toast.error("Erro na remoção do produto");
        }
      })
    );
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      const productStockLimit = await api
        .get(`stock/${productId}`)
        .then((response) => {
          const data = response.data as Stock;
          return data.amount;
        });

      if (productCartIndex === -1) {
        toast.error("Erro na alteração de quantidade do produto");
      } else {
        if (productStockLimit >= amount) {
          setCart(
            produce((draft) => {
              draft[productCartIndex].amount = amount;
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify(current(draft))
              );
            })
          );
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
